import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";

@Entity('telegram_message')
export class TelegramMessage extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    type!: string;


    @Column({type: 'text', nullable: true})
    caption!: string;

    @Column({type: 'text', nullable: true})
    buttons!: string;

    @Column({type: 'varchar', nullable: true})
    file_id!: string;

    @Column({type: 'bigint', nullable: false, default: 0})
    all_users!: number;

    @Column({type: 'bigint', nullable: false, default: 0})
    send_count!: number;

    @Column({type: 'bigint', nullable: false, default: 0})
    un_send_count!: number;


}
