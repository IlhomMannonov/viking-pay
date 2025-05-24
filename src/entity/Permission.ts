import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {Module} from "./Module";

@Entity('permission')
export class Permission extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    name!: string;

    @Column({type: 'varchar', nullable: true})
    desc!: string;


    //ISCHI MODUL ENG OXIRGISI BO'LADI
    @ManyToOne(() => Module, module => module.id)
    @JoinColumn({name: 'module_id'})
    module!: Module;

    @Column({name: 'module_id', nullable: true})
    module_id!: number | null; // Foreign key sifatida saqlanad

    check: boolean = false
}
