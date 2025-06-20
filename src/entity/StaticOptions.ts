import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";

@Entity('static_options')
export class StaticOptions {

    @PrimaryColumn({ type: 'text' })
    key!: string;

    @Column({ type: 'text', nullable: false })
    value!: string;

    @Column({ type: 'text', nullable: true })
    desc!: string;
}
