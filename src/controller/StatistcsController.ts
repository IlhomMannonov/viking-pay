import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Provider} from "../entity/Provider";
import {Transaction} from "../entity/Transaction";
import {validFields} from "../utils/CustomErrors";
import {deposit} from "./TransactionProviderController";
import {getRepository} from "typeorm";

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
        const userId = Number(req.params.user_id);


        const [
            day_deposits_wallet,
            week_deposits_wallet,
            year_deposits_wallet,
            day_withdraws_wallet,
            week_withdraws_wallet,
            year_withdraws_wallet,
            day_deposits_provider,
            week_deposits_provider,
            year_deposits_provider,
            day_withdraws_provider,
            week_withdraws_provider,
            year_withdraws_provider
        ] = await Promise.all([
            getAggregatedTransactions(userId, 'day', 'wallet', true),
            getAggregatedTransactions(userId, 'week', 'wallet', true),
            getAggregatedTransactions(userId, 'year', 'wallet', true),
            getAggregatedTransactions(userId, 'day', 'wallet', false),
            getAggregatedTransactions(userId, 'week', 'wallet', false),
            getAggregatedTransactions(userId, 'year', 'wallet', false),
            getAggregatedTransactions(userId, 'day', 'provider', true),
            getAggregatedTransactions(userId, 'week', 'provider', true),
            getAggregatedTransactions(userId, 'year', 'provider', true),
            getAggregatedTransactions(userId, 'day', 'provider', false),
            getAggregatedTransactions(userId, 'week', 'provider', false),
            getAggregatedTransactions(userId, 'year', 'provider', false),
        ]);

        const all = await transactionRepository
            .createQueryBuilder('t')
            .select(
                `SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END)`,
                'wallet_in'
            )
            .addSelect(
                `SUM(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN t.amount ELSE 0 END)`,
                'wallet_out'
            )
            .addSelect(
                `SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END)`,
                'provider_in'
            )
            .addSelect(
                `SUM(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN t.amount ELSE 0 END)`,
                'provider_out'
            )
            .where('t.user = :userId', {userId})
            .andWhere('t.status = :status', {status: 'success_pay'})
            .getRawOne();

        res.status(200).json({
            all,
            chart: {
                wallet: {
                    deposits: {
                        day: day_deposits_wallet,
                        week: week_deposits_wallet,
                        year: year_deposits_wallet,
                    },
                    withdraws: {
                        day: day_withdraws_wallet,
                        week: week_withdraws_wallet,
                        year: year_withdraws_wallet,
                    },
                },
                provider: {
                    deposits: {
                        day: day_deposits_provider,
                        week: week_deposits_provider,
                        year: year_deposits_provider,
                    },
                    withdraws: {
                        day: day_withdraws_provider,
                        week: week_withdraws_provider,
                        year: year_withdraws_provider,
                    },
                },
            },
        });
    } catch (err) {
        next(err);
    }
};


export const main_chart = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const getUserCounts = async (granularity: 'day' | 'week' | 'year') => {
            let dateExpr: string;
            let series: string;
            let interval: string;
            let step: string;

            switch (granularity) {
                case 'day':
                    dateExpr = 'u.created_at::date';
                    series = `generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')`;
                    step = '1 day';
                    interval = '30 days';
                    break;
                case 'week':
                    dateExpr = `date_trunc('week', u.created_at)::date`;
                    series = `generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks', date_trunc('week', CURRENT_DATE), '1 week')`;
                    step = '1 week';
                    interval = '4 weeks';
                    break;
                case 'year':
                    dateExpr = `date_trunc('year', u.created_at)::date`;
                    series = `generate_series(date_trunc('year', CURRENT_DATE) - INTERVAL '3 years', date_trunc('year', CURRENT_DATE), '1 year')`;
                    step = '1 year';
                    interval = '4 years';
                    break;
            }

            const rawQuery = `
        WITH dates AS (
          SELECT generate_series AS period FROM ${series}
        )
        SELECT
          d.period,
          COUNT(u.id) AS count
        FROM dates d
        LEFT JOIN "users" u ON (
          ${dateExpr} = d.period AND u.deleted = false AND u.created_at >= CURRENT_DATE - INTERVAL '${interval}'
        )
        GROUP BY d.period
        ORDER BY d.period;
      `;

            return await userRepository.query(rawQuery);
        };

        const [dayUserCounts, weekUserCounts, yearUserCounts] = await Promise.all([
            getUserCounts('day'),
            getUserCounts('week'),
            getUserCounts('year')
        ]);

        // Wallet va Provider bo‘yicha chartlar (oldingi koddan)
        const day_deposits_wallet = await getAggregatedTransactions(null, 'day', 'wallet', true);
        const week_deposits_wallet = await getAggregatedTransactions(null, 'week', 'wallet', true);
        const year_deposits_wallet = await getAggregatedTransactions(null, 'year', 'wallet', true);

        const day_withdraws_wallet = await getAggregatedTransactions(null, 'day', 'wallet', false);
        const week_withdraws_wallet = await getAggregatedTransactions(null, 'week', 'wallet', false);
        const year_withdraws_wallet = await getAggregatedTransactions(null, 'year', 'wallet', false);

        const day_deposits_provider = await getAggregatedTransactions(null, 'day', 'provider', true);
        const week_deposits_provider = await getAggregatedTransactions(null, 'week', 'provider', true);
        const year_deposits_provider = await getAggregatedTransactions(null, 'year', 'provider', true);

        const day_withdraws_provider = await getAggregatedTransactions(null, 'day', 'provider', false);
        const week_withdraws_provider = await getAggregatedTransactions(null, 'week', 'provider', false);
        const year_withdraws_provider = await getAggregatedTransactions(null, 'year', 'provider', false);

        const all = await transactionRepository
            .createQueryBuilder('t')
            .select(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_in')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_out')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'provider_in')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'provider_out')
            .where('t.status = :status', {status: 'success_pay'})
            .getRawOne();

        const user_count = await userRepository
            .createQueryBuilder('u')
            .where('u.deleted = false')
            .getCount();

        res.status(200).json({
            all,
            user_count,
            chart: {
                user_counts: {
                    day: dayUserCounts,
                    week: weekUserCounts,
                    year: yearUserCounts
                },
                wallet: {
                    deposits: {day: day_deposits_wallet, week: week_deposits_wallet, year: year_deposits_wallet},
                    withdraws: {day: day_withdraws_wallet, week: week_withdraws_wallet, year: year_withdraws_wallet}
                },
                provider: {
                    deposits: {day: day_deposits_provider, week: week_deposits_provider, year: year_deposits_provider},
                    withdraws: {
                        day: day_withdraws_provider,
                        week: week_withdraws_provider,
                        year: year_withdraws_provider
                    }
                }
            }
        });
    } catch (err) {
        next(err);
    }
};


async function getAggregatedTransactions(userId: number | null, granularity: 'day' | 'week' | 'year', type: 'wallet' | 'provider', program: boolean) {
    let seriesSql: string;
    let truncExpr: string;
    let interval: string;

    switch (granularity) {
        case 'day':
            seriesSql = `generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')`;
            truncExpr = 't.created_at::date';
            interval = '30 days';
            break;
        case 'week':
            seriesSql = `generate_series(date_trunc('week', CURRENT_DATE) - INTERVAL '3 weeks', date_trunc('week', CURRENT_DATE), '1 week')`;
            truncExpr = `date_trunc('week', t.created_at)::date`;
            interval = '4 weeks';
            break;
        case 'year':
            seriesSql = `generate_series(date_trunc('year', CURRENT_DATE) - INTERVAL '3 years', date_trunc('year', CURRENT_DATE), '1 year')`;
            truncExpr = `date_trunc('year', t.created_at)::date`;
            interval = '4 years';
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
      COALESCE(SUM(t.amount), 0) AS amount,
      COUNT(t.id) AS count
    FROM dates d
    LEFT JOIN transaction t
      ON (
        ${truncExpr} = d.period
        AND (t.user = $1 OR $1 IS NULL)
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


export const in_out_statics = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {from_date, to_date} = req.body;

        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const endOfToday = new Date(now.setHours(23, 59, 59, 999));

        const from = from_date ? new Date(from_date) : startOfToday;
        const to = to_date ? new Date(to_date) : endOfToday;

        const qb = transactionRepository
            .createQueryBuilder('t')
            .select(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'wallet_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_out')
            .addSelect(`COUNT(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN 1 ELSE NULL END)`, 'wallet_out_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'provider_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'provider_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'provider_out')
            .addSelect(`COUNT(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN 1 ELSE NULL END)`, 'provider_out_count')
            .where('t.status = :status', {status: 'success_pay'})
            .andWhere('t.created_at BETWEEN :from AND :to', {from, to});

        const transactionStats = await qb.getRawOne();

        const totalUsers = await userRepository
            .createQueryBuilder('u')
            .where('u.deleted = false')
            .getCount();

        const usersInRange = await userRepository
            .createQueryBuilder('u')
            .where('u.deleted = false')
            .andWhere('u.created_at BETWEEN :from AND :to', {from, to})
            .getCount();

        res.status(200).send({
            ...transactionStats,
            total_users: totalUsers,
            users_in_range: usersInRange
        });
    } catch (err) {
        next(err);
    }
};

export const getProviderTransactionStats = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {from_date, to_date} = req.body;

        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const endOfToday = new Date(now.setHours(23, 59, 59, 999));

        const from = from_date ? new Date(from_date) : startOfToday;
        const to = to_date ? new Date(to_date) : endOfToday;

        const data = await providerRepository
            .createQueryBuilder('p')
            .leftJoin(
                'transaction',
                't',
                `t.provider_id = p.id AND t.status = :status AND t.created_at BETWEEN :from AND :to`,
                {status: 'success_pay', from, to}
            )
            .select('p.id', 'provider_id')
            .addSelect('p.name', 'provider_name')
            .addSelect('p.logo_id', 'logo_id')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'wallet_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_out')
            .addSelect(`COUNT(CASE WHEN t.type = 'wallet' AND t.amount < 0 THEN 1 ELSE NULL END)`, 'wallet_out_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'provider_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'provider_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN t.amount ELSE 0 END), 0)`, 'provider_out')
            .addSelect(`COUNT(CASE WHEN t.type = 'provider' AND t.amount < 0 THEN 1 ELSE NULL END)`, 'provider_out_count')
            .groupBy('p.id, p.name, p.logo_id')
            .getRawMany();

        res.status(200).send(data);
    } catch (err) {
        next(err);
    }
};


export const getTopDepositUsersDetailed = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {from_date, to_date} = req.body;

        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const endOfToday = new Date(now.setHours(23, 59, 59, 999));

        const from = from_date ? new Date(from_date) : startOfToday;
        const to = to_date ? new Date(to_date) : endOfToday;

        const data = await transactionRepository
            .createQueryBuilder('t')
            .innerJoin('t.user', 'u')
            .select('u.id', 'user_id')
            .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'full_name')
            .addSelect("u.logo_id", 'logo')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'wallet_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'wallet' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'wallet_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'provider_in')
            .addSelect(`COUNT(CASE WHEN t.type = 'provider' AND t.amount > 0 THEN 1 ELSE NULL END)`, 'provider_in_count')
            .addSelect(`COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)`, 'total_in')
            .where('t.status = :status', {status: 'success_pay'})
            .andWhere('u.deleted = false')
            .andWhere('t.created_at BETWEEN :from AND :to', {from, to})
            .groupBy('u.id, u.first_name, u.last_name, u.logo_id')
            .orderBy('total_in', 'DESC')
            .limit(10)
            .getRawMany();

        res.status(200).send(data);
    } catch (err) {
        next(err);
    }
};


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