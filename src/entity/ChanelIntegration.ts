import {Column, Entity, PrimaryColumn} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('chanel_integration')
export class ChanelIntegration extends BaseEntityFull {

    @PrimaryColumn({type: 'text'})
    chanel_id!: string;

    @Column("int", {array: true, nullable: true, default: {}})
    responsible_chat_ids!: [];

    @Column({type: 'varchar', nullable: false})
    type!: string; //XABAR, YOKI ACTION kanal

    @Column({type: 'varchar', nullable: false})
    chanel_name!: string; //XABAR, YOKI ACTION kanal
}
