import {Column, Entity} from "typeorm";
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('attachment')
export class Attachment extends BaseEntityFull {


    @Column({type: 'varchar', length: 255})
    original_name!: string;

    @Column({type: 'varchar', length: 255})
    file_name!: string;

    @Column({type: 'varchar', length: 255})
    file_type!: string;

    @Column({type: 'varchar', length: 255})
    file_size!: number;

    @Column({type: 'varchar', length: 255})
    href!: string;



}