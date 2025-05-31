import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {validFields} from "../utils/CustomErrors";
import {AppDataSource} from "../config/db";
import {Slider} from "../entity/Slider";
import {RestException} from "../middilwares/RestException";

const sliderRepository = AppDataSource.getRepository(Slider);
export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {link, photo_id, order_index} = req.body;
        validFields(['link', 'photo_id'], req.body);
        const last_slide = await sliderRepository.findOne({
            where: {},
            order: { order_index: 'desc' }
        });

        const totalIndex = last_slide?.order_index ?? 0;

        let new_index: number;

        if (order_index != null && !isNaN(order_index)) {
            // Oxirgidan bitta oldinga qo‘yamiz
            new_index = Math.min(order_index, totalIndex - 1);

            // Oradagi slayderlarni bir pog‘onaga suramiz
            await sliderRepository
                .createQueryBuilder()
                .update(Slider)
                .set({order_index: () => '"order_index" + 1'})
                .where('"order_index" >= :index', {index: new_index})
                .execute();
        } else {
            // Agar order_index berilmasa — oxiriga qo‘shamiz
            new_index = totalIndex + 1;
        }

        const slider = sliderRepository.create({
            link,
            photo_id,
            order_index: new_index,
        });

        await sliderRepository.save(slider);

        res.status(201).json({
            success: true,
            message: "Slider muvaffaqiyatli yaratildi",
            data: slider
        });
    } catch (error) {
        next(error);
    }
}

export const getAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const sliders = await sliderRepository.find({
            where: { deleted: false },
            order: { order_index: 'ASC' }
        });

        res.status(200).json({
            success: true,
            data: sliders
        });
    } catch (error) {
        next(error);
    }
};


export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { link, photo_id, order_index } = req.body;

        const slider = await sliderRepository.findOne({ where: { id: Number(id), deleted: false } });

        if (!slider) {
            throw RestException.notFound("Slider topilmadi");
        }

        if (order_index != null && !isNaN(order_index)) {
            // order_index o‘zgarsa, boshqa elementlarni siljitish kerak bo‘lishi mumkin (istalgan holatda sozlansa bo‘ladi)
            // bu yerda shunchaki yangilanmoqda
            slider.order_index = order_index;
        }

        if (link !== undefined) slider.link = link;
        if (photo_id !== undefined) slider.photo_id = photo_id;

        await sliderRepository.save(slider);

        res.status(200).json({
            success: true,
            message: "Slider yangilandi",
            data: slider
        });
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;

        const slider = await sliderRepository.findOne({ where: { id: Number(id), deleted: false } });

        if (!slider) {
            throw RestException.notFound("Slider topilmadi");
        }

        slider.deleted = true;
        await sliderRepository.save(slider);

        res.status(200).json({
            success: true,
            message: "Slider o‘chirildi"
        });
    } catch (error) {
        next(error);
    }
};
