import {Column, Entity, JoinColumn} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {Attachment} from "./Attachment";

@Entity('provider')
export class Provider extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    name!: string;

    @Column({type: 'text', nullable: true})
    api!: string;

    @Column({type: 'decimal', precision: 10, scale: 2, default: 0})
    min_amount!: number;

    @Column({type: 'decimal', precision: 10, scale: 2, default: 0})
    max_amount!: number;

    @JoinColumn({name: 'logo_id'})
    logo!: Attachment;

    @Column({name: 'logo_id', nullable: true})
    logo_id!: number; // Foreign key sifatida saqlanadi


    @Column({type: 'text', nullable: false})
    hash!: string;


    @Column({type: 'text', nullable: false})
    cashierpass!: string;


    @Column({type: 'text', nullable: false})
    login!: string;


    @Column({type: 'text', nullable: false})
    cashdeskid!: string;



}
