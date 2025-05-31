import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";
import {TgAccount} from "./TgAccount";

@Entity('card')
export class Card extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    name!: string;

    @Column({type: 'text', nullable: true})
    number!: string;

    // kartada qancha limit qolganini ko'rsatadi
    @Column({type: 'bigint', scale: 2, default: 0})
    limit!: number;

    @Column({type: 'boolean', nullable: false, default: false})
    is_user_card!: boolean;


    @ManyToOne(() => User, user => user.id)
    @JoinColumn({name: 'user'})
    user!: User;

    @Column({name: 'user', nullable: true})
    user_id!: number; // Foreign key sifatida saqlanad

    // bu karta telegramdagi card xabar kartasi bilan ulash uchun kerak
    @ManyToOne(() => TgAccount, tg_account => tg_account.id)
    @JoinColumn({name: 'tg_account'})
    tg_account!: TgAccount;

    @Column({name: 'tg_account', nullable: true})
    tg_account_id!: number | null; // Foreign key sifatida saqlanad


    // CARD XABARDAGI karta raqami 986024*****3667
    @Column({type: 'text', nullable: true})
    card_hold!: string;


    @Column({type: 'text', nullable: true})
    card_img!: string;

}
