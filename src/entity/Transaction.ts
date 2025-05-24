import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";
import {Provider} from "./Provider";
import {Card} from "./Card";
import {BaseEntityUUID} from "./template/BaseEntityUUID";

@Entity('transaction')
export class Transaction extends BaseEntityUUID {


    // kartada qancha limit qolganini ko'rsatadi
    @Column({type: 'bigint', scale: 2, default: 0})
    amount!: number;

    // AGAR KDEPOZIT BOLAYOTGAN BOLSA KARTANI OXIRGI BALANSI SET QILINADI BU YERGA
    @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
    last_card_amount!: number;

    @ManyToOne(() => User, user => user.id)
    @JoinColumn({name: 'user'})
    user!: User;

    @Column({name: 'user', nullable: true})
    user_id!: number; // Foreign key sifatida saqlanad

    @ManyToOne(() => Provider, provider => provider.id)
    @JoinColumn({name: 'provider'})
    provider!: Provider;

    @Column({name: 'provider', nullable: true})
    provider_id!: number; // Foreign key sifatida saqlanad


    @ManyToOne(() => Card, card => card.id)
    @JoinColumn({name: 'card'})
    card!: Card;

    @Column({name: 'card', nullable: true})
    card_id!: number; // Foreign key sifatida saqlanad


    //ERTAGA KARTA DELETE BO"LSA DATASI QOLADI
    @Column({type: 'text', nullable: true})
    card_number!: string;

    @Column({type: 'varchar', nullable: true})
    card_name!: string;


    @Column({type: 'varchar', nullable: false, default: "wallet"})
    type!: string;



    //TRUE BO'LSA KRIM BO'LADI, FALSE BO'LSA CHIQIM
    @Column({type: 'boolean', nullable: false, default: true})
    program!: boolean;

    @Column({type: 'varchar', nullable: true})
    desc!: string;

    // BOKMAKERLIK KONTORA ID
    @Column({type: 'varchar', nullable: true})
    bet_provider!: string;

    // BOKMAKERLIK KONTORA ID
    @Column({type: 'varchar', nullable: true})
    operation_id!: string;



    //pending_deposit = tolov yaratildi tolash kutilmoqda
    //i_payed = Kartadan pul tashladim dedi
    //reject = Tolov bekor qilindi
    //success_pay = To'lov bajarildi
    //partial_success = Tolov aytilgan miqdorda emas
    //pending = Kutilmoqda

}
