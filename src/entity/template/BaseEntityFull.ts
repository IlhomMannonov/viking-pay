import {PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Column} from 'typeorm';

export abstract class BaseEntityFull {
    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn({type: 'timestamptz'})
    created_at!: Date;

    @UpdateDateColumn({type: 'timestamptz'})
    updated_at!: Date;

    @Column({type: 'boolean', default: false})
    deleted!: boolean;

    @Column({type: 'varchar', length: 255, default: 'active'})
    status!: string;
}
