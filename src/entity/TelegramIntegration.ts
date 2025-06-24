import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";

@Entity('telegram_integration')
export class TelegramIntegration extends BaseEntityFull {

    @Column({type: 'varchar', nullable: false})
    type!: string;


    // CHAP TOMONDAKI KO'RINISHNI BELGILAYDI
    @Column("int", {array: true, nullable: true, default: {}})
    modules!: number[];


    //BU ROLEGA TEGSIHLI HQUQLAR
    @Column("int", {array: true, nullable: true, default: {}})
    permissions!: number[];
}
