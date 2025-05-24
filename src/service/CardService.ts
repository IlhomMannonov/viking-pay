import {AppDataSource} from "../config/db";
import {Card} from "../entity/Card";
import {RestException} from "../middilwares/RestException";
import {HttpStatus} from "../entity/ResponseData/HttpStatus";
import {__} from "i18n";
import logger from "../config/logger";
import {get_tg_cards, getCardInfoByNumber} from "../controller/TelegramAccountController";

const cardRepository = AppDataSource.getRepository(Card);


export async function getAvailableCard(amount: number,) {
    const card = await cardRepository
        .createQueryBuilder("card")
        .leftJoinAndSelect("card.tg_account", "tg_account")
        .where("card.deleted = :deleted", {deleted: false})
        .andWhere("card.status = :status", {status: 'active'})
        .andWhere("card.limit > :amount", {amount})
        .andWhere("card.is_user_card = :isUserCard", {isUserCard: false})
        .andWhere("card.tg_account_id IS NOT NULL")
        .getOne();

    if (!card) {
        logger.info(`${amount} miqdori uchun karta mavjud emas`)
        throw RestException.restThrow(__('card.available_card_not_found'), HttpStatus.NOT_FOUND)
    }
    const tg_cards = await get_tg_cards(Number(card.tg_account_id));
    const card_info = await getCardInfoByNumber(tg_cards.cards, card.card_hold)


    card.status = 'pending_pay';
    await cardRepository.save(card)
    logger.info(`${card.id}, - ${card.number} karta pending_pay statusiga o'tdi`)

    return {card: card, card_info: card_info};
}