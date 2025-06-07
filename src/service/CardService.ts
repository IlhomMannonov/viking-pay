import {AppDataSource} from "../config/db";
import {Card} from "../entity/Card";
import {RestException} from "../middilwares/RestException";
import {HttpStatus} from "../entity/ResponseData/HttpStatus";
import {__} from "i18n";
import logger from "../config/logger";
import {get_tg_cards, getCardInfoByNumber} from "../controller/TelegramAccountController";
import {Transaction} from "../entity/Transaction";
import {In} from "typeorm";
import {getTransTime} from "../controller/TransactionController";

const cardRepository = AppDataSource.getRepository(Card);
const transactionRepository = AppDataSource.getRepository(Transaction);


export async function getAvailableCard(amount: number,) {

    const pending_cards = await cardRepository.find({where: {status: "pending_pay", deleted: false}})
    const cards_id = pending_cards.map(card => card.id)
    const trs = await transactionRepository.find({
        where: {
            card_id: In(cards_id),
            deleted: false,
            status: "pending_deposit"
        }
    })
    let card_ids:number[] = []

    trs.map(transaction => {
        let timer = 0
        timer =  getTransTime(transaction)
        if (timer===0){
            card_ids.push(Number(transaction.card_id))
        }
    })

    await AppDataSource
        .createQueryBuilder()
        .update(Card)
        .set({ status: 'active' })
        .whereInIds(card_ids)
        .execute()

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