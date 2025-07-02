import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Provider} from "../entity/Provider";
import {Transaction} from "../entity/Transaction";
import {validFields} from "../utils/CustomErrors";
import {deposit} from "./TransactionProviderController";

const userRepository = AppDataSource.getRepository(User);
const transactionRepository = AppDataSource.getRepository(Transaction);
const providerRepository = AppDataSource.getRepository(Provider);
export const user_main_statics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user.id;
        const {last_days = 30, program} = req.body;

        validFields(['last_days', 'program'], req.body);

        // Oxirgi N kunni hisoblash (shu kunni ichiga oladi)
        const now = new Date();
        const fromDate = new Date();
        fromDate.setDate(now.getDate() - Number(last_days) + 1); // +1 chunki bugungi kunni ham qo‘shamiz
        fromDate.setHours(0, 0, 0, 0); // Kun boshiga olib kelamiz

        const results = await AppDataSource
            .getRepository(Transaction)
            .createQueryBuilder('t')
            .innerJoin('t.provider', 'p')
            .select('p.name', 'name')
            .addSelect('SUM(t.amount)', 'total_amount')
            .where('t.type = :type', {type: 'provider'})
            .andWhere('t.program = :program', {program: program})
            .andWhere('t."user" = :userId', {userId: user_id})
            .andWhere('t.created_at >= :fromDate', {fromDate})
            .andWhere('p.deleted = false')
            .groupBy('p.name')
            .getRawMany()

        const labels = results.map(item => item.name)
        const label_data = results.map(item => Number(item.total_amount))
        const total = label_data.reduce((sum, value) => sum + value, 0)

        res.status(200).json({data: {labels, total, label_data}})
    } catch (err) {
        next(err)
    }
}


export const user_chart_statics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {user_id} = req.params

        // HAMYONGA KIRIMLAR
        const day_deposits_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'day', 'wallet', true)
        const week_deposits_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'week', 'wallet', true)
        const year_deposits_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'year', 'wallet', true)

        // HAMYONDAN CHIQIMLAR
        const day_withdraws_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'day', 'wallet', false)
        const week_withdraws_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'week', 'wallet', false)
        const year_withdraws_wallet = await getAggregatedTransactionsOneUser(Number(user_id), 'year', 'wallet', false)

        // PROVIDER KIRIMLAR
        const day_deposits_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'day', 'provider', true)
        const week_deposits_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'week', 'provider', true)
        const year_deposits_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'year', 'provider', true)

        // PROVIDER CHIQIMLAR
        const day_withdraws_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'day', 'provider', false)
        const week_withdraws_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'week', 'provider', false)
        const year_withdraws_provider = await getAggregatedTransactionsOneUser(Number(user_id), 'year', 'provider', false)


        const all = await transactionRepository
            .createQueryBuilder('t')
            .select(`SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END)`, 'wallet_in')
            .addSelect(`SUM(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN t.amount ELSE 0 END)`, 'wallet_out')
            .addSelect(`SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END)`, 'provider_in')
            .addSelect(`SUM(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN t.amount ELSE 0 END)`, 'provider_out')
            .where('t.user = :user_id', {user_id})
            .andWhere('t.status = :status', {status: 'success_pay'})
            .getRawOne();

        res.status(200).json({
            all,
            chart: {
                wallet: {
                    deposits: {
                        day: day_deposits_wallet,
                        week: week_deposits_wallet,
                        year: year_deposits_wallet
                    },
                    withdraws: {
                        day: day_withdraws_wallet,
                        week: week_withdraws_wallet,
                        year: year_withdraws_wallet
                    }
                },
                provider: {
                    deposits: {
                        day: day_deposits_provider,
                        week: week_deposits_provider,
                        year: year_deposits_provider
                    },
                    withdraws: {
                        day: day_withdraws_provider,
                        week: week_withdraws_provider,
                        year: year_withdraws_provider
                    }
                }
            }
        })
    } catch (err) {
        next(err)
    }
}

async function getAggregatedTransactionsOneUser(
    userId: number,
    granularity: 'day' | 'week' | 'year',
    type: 'wallet' | 'provider',
    program: boolean
) {
    let seriesSql: string;
    let truncExpr: string;
    let interval: string;
    let step: string;

    switch (granularity) {
        case 'day':
            seriesSql = `generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')`;
            truncExpr = 't.created_at::date';
            interval = '30 days';
            step = '1 day';
            break;
        case 'week':
            seriesSql = `generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks', date_trunc('week', CURRENT_DATE), '1 week')`;
            truncExpr = `date_trunc('week', t.created_at)::date`;
            interval = '4 weeks';
            step = '1 week';
            break;
        case 'year':
            seriesSql = `generate_series(date_trunc('year', CURRENT_DATE) - INTERVAL '3 years', date_trunc('year', CURRENT_DATE), '1 year')`;
            truncExpr = `date_trunc('year', t.created_at)::date`;
            interval = '4 years';
            step = '1 year';
            break;
        default:
            throw new Error('Invalid granularity');
    }

    const rawQuery = `
    WITH dates AS (
      SELECT generate_series AS period FROM ${seriesSql}
    )
    SELECT
      d.period,
      COALESCE(SUM(t.amount), 0) AS amount
    FROM dates d
    LEFT JOIN transaction t
      ON (
        ${truncExpr} = d.period
        AND t.user = $1
        AND t.amount > 0
        AND t.program = $2
        AND t.type = $3
        AND t.status = 'success_pay'
        AND t.created_at >= CURRENT_DATE - INTERVAL '${interval}'
      )
    GROUP BY d.period
    ORDER BY d.period;
  `;

    return await transactionRepository.query(rawQuery, [userId, program, type]);
}


export const all_my_deposit_withdraws = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {


    const user_id = req.user.id;
    const result = await AppDataSource
        .createQueryBuilder()
        .select([
            `(SELECT SUM(t.amount)
          FROM transaction t
          WHERE t.deleted = false
            AND t.program = true
            AND t.type = 'wallet'
            AND t.status IN ('success_pay', 'partial_success')
            AND t."user" = :userId) AS deposit`,
            `(SELECT SUM(t.amount)
          FROM transaction t
          WHERE t.deleted = false
            AND t.program = false
            AND t.type = 'wallet'
            AND t.status IN ('success_pay', 'partial_success')
            AND t."user" = :userId) AS withdraw`
        ])
        .from(Transaction, 'tx')
        .setParameters({userId: user_id})
        .getRawOne()

    res.status(200).json({data: result});

}