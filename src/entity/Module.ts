import {Column, Entity, JoinColumn, ManyToOne, OneToMany} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {User} from "./User";
import {TgAccount} from "./TgAccount";
import {Permission} from "./Permission";

@Entity('module')
export class Module extends BaseEntityFull {

    @Column({type: 'varchar', nullable: true})
    name!: string;


    //OTA MODUL
    @ManyToOne(() => Module, module => module.id)
    @JoinColumn({name: 'module_id'})
    module!: Module | null;

    @Column({name: 'module_id', nullable: true})
    module_id!: number | null; // Foreign key sifatida saqlanad


    @Column({name: 'order_index', nullable: true})
    order_index!: number; // Foreign key sifatida saqlanad

    @OneToMany(() => Permission, permission => permission.module)
    permissions_list!: Permission[];

    submodules!: Module[]

    permissions!: Permission[]

    check: boolean = false

}
