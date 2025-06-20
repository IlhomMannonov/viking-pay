import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Provider} from "../entity/Provider";
import {Transaction} from "../entity/Transaction";
import {validFields} from "../utils/CustomErrors";

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
        .setParameters({ userId: user_id })
        .getRawOne()

    res.status(200).json({data: result});

}