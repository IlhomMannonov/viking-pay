import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";

@Entity('tg_account')
export class TgAccount extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    name!: string;

    @Column({type: 'text', nullable: true})
    phone_number!: string;

    @Column({type: 'text', nullable: true})
    session_id!: string;


}
