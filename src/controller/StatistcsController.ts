import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Provider} from "../entity/Provider";
import {Transaction} from "../entity/Transaction";
import {validFields} from "../utils/CustomErrors";

const userRepository = AppDataSource.getRepository(User);
const providerRepository = AppDataSource.getRepository(Provider);
export const user_main_statics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user.id;
        const { last_days = 30, program } = req.body;

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
            .where('t.type = :type', { type: 'provider' })
            .andWhere('t.program = :program', { program: Boolean(program) })
            .andWhere('t."user" = :userId', { userId: user_id })
            .andWhere('t.created_at >= :fromDate', { fromDate })
            .andWhere('p.deleted = false')
            .groupBy('p.name')
            .getRawMany()

        const labels = results.map(item => item.name)
        const label_data = results.map(item => Number(item.total_amount))
        const total = label_data.reduce((sum, value) => sum + value, 0)

        res.status(200).json({ data: { labels, total, label_data } })
    } catch (err) {
        next(err)
    }
}