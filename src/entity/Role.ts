import {Column, Entity} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";

@Entity('role')
export class Role extends BaseEntityFull {

    @Column({type: 'varchar', nullable: false})
    name!: string;


    // CHAP TOMONDAKI KO'RINISHNI BELGILAYDI
    @Column("int", {array: true, nullable: true, default: {}})
    modules!: number[];


    //BU ROLEGA TEGSIHLI HQUQLAR
    @Column("int", {array: true, nullable: true, default: {}})
    permissions!: number[];
}
