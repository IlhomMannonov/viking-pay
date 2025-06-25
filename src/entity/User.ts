import {Column, Entity, JoinColumn, ManyToOne} from 'typeorm';
import {BaseEntityFull} from "./template/BaseEntityFull";
import {Role} from "./Role";

@Entity('users')
export class User extends BaseEntityFull {


    @Column({type: 'varchar', length: 255, nullable: true})
    first_name!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    last_name!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    phone_number!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    patron!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    password!: string;

    @Column({type: 'timestamp', nullable: true})
    last_login_time!: Date;

    @Column({type: 'timestamp', nullable: true})
    birthday!: Date;

    @Column({type: 'boolean', default: false})
    phone_verified!: boolean;

    @Column({type: 'varchar', length: 255, nullable: true})
    chat_id!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    logo_id!: string;

    @Column({type: 'varchar', length: 255, nullable: true})
    state!: string;

    @Column({type: 'boolean', default: false})
    is_bot_user!: boolean;

    @Column({type: 'boolean', default: false})
    super_admin!: boolean;

    //USERNI HISOBI FAQAT SO"MDA BO"LADI
    @Column({type: 'decimal', precision: 10, scale: 2, default: 0})
    amount!: number;



    @ManyToOne(() => Role, role => role.id)
    @JoinColumn({name: 'role_id'})
    role!: Role | null;

    @Column({name: 'role_id', nullable: true})
    role_id!: number | null; // Foreign key sifatida saqlanad

}
