import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";

@Entity('slider')
export class Slider extends BaseEntityFull {

    @Column({type: 'text', nullable: false})
    link!: string;

    @Column({type: 'bigint', nullable: false})
    photo_id!: number;

    @Column({type: 'int', nullable: false})
    order_index!: number;

}
