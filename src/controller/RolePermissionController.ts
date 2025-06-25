import {AuthenticatedRequest} from "../entity/custom/AuthenticatedRequest";
import {NextFunction, Response} from "express";
import {RestException} from "../middilwares/RestException";
import {AppDataSource} from "../config/db";
import {Role} from "../entity/Role";
import {QueryFailedError} from "typeorm";
import {Module} from "../entity/Module";
import {Permission} from "../entity/Permission";
import {validFields} from "../utils/CustomErrors";
import {User} from "../entity/User";
import {__} from "i18n";

const roleRepository = AppDataSource.getRepository(Role);
const userRepository = AppDataSource.getRepository(User);
const moduleRepository = AppDataSource.getRepository(Module);
const permissionRepository = AppDataSource.getRepository(Permission);


// CREATE
export const createRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {name} = req.body;
        const exists_role = await roleRepository.findOne({where: {name, deleted: false}});
        if (exists_role) return next(RestException.notFound('All ready exists'));

        const role = await roleRepository.save({name});

        res.status(201).json({success: true, data: role, message: 'Role created successfully.'});
    } catch (err) {

        next(err);
    }
};

// READ ALL
export const getRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const roles = await roleRepository.find({order: {created_at: "desc",}, where: {deleted: false}});
    res.status(200).json({success: true, data: roles});
};

// UPDATE
export const updateRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const {id} = req.params;
    const {name} = req.body;

    const role = await roleRepository.findOne({where: {id: Number(id), deleted: false}});
    if (!role) return next(RestException.notFound('Role not found'));

    role.name = name;
    try {
        const updatedRole = await roleRepository.save(role);
        res.status(200).json({success: true, data: updatedRole, message: 'Role updated successfully.'});
    } catch (err) {
        if (err instanceof QueryFailedError && (err as any).code === '23505') {
            return next(RestException.badRequest('Role name already exists.'));
        }
        next(err);
    }
};

// DELETE
export const deleteRole = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const {id} = req.params;

    const role = await roleRepository.findOne({where: {id: Number(id), deleted: false}});
    if (!role) return next(RestException.notFound('Role not found'));

    role.deleted = true;
    await roleRepository.save(role);
    res.status(200).json({success: true, message: 'Role deleted successfully.'});
};
//ADMIN
export const get_one_role = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const role_id = Number(req.params.id);
        const role = await roleRepository.findOne({where: {id: role_id, deleted: false}});
        if (!role) throw RestException.notFound('Role not found');

        // Barcha modullarni permissions bilan birga olish
        const all_modules = await moduleRepository
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.permissions_list', 'p')
            .where('m.deleted = false')
            .select([
                'm.id',
                'm.name',
                'm.module_id',
                'm.order_index',
                'p.id',
                'p.name',
                'p.desc',
                'p.module_id',
            ])
            .orderBy('m.order_index', 'ASC')
            .getMany();

        const modulesWithSubmodules = all_modules
            .filter(m => !m.module_id) // faqat ota modullar
            .map(module => {
                const submodules = all_modules
                    .filter(sm => sm.module_id === module.id)
                    .map(sm => ({
                        id: sm.id,
                        name: sm.name,
                        check: role.modules.includes(sm.id),
                        order_index: sm.order_index,
                        permissions: sm.permissions_list.map(p => ({
                            id: p.id,
                            name: p.name,
                            desc: p.desc,
                            check: role.permissions.includes(p.id),
                        })),
                    }));

                return {
                    id: module.id,
                    name: module.name,
                    check: role.modules.includes(module.id),
                    order_index: module.order_index,
                    permissions: module.permissions_list.map(p => ({
                        id: p.id,
                        desc: p.desc,
                        name: p.name,
                        check: role.permissions.includes(p.id),
                    })),
                    submodules,
                };
            });

        res.status(200).json({
            success: true,
            data: {modulesWithSubmodules, ...{role_id: role.id, role_name: role.name}}
        });

    } catch (err) {
        next(err);
    }
};

// ADMIN
export const set_module_permission = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {

        const {role_id, module_id, permission_id} = req.body;
        validFields(['role_id'], req.body);

        const role = await roleRepository.findOne({where: {id: role_id, deleted: false}});
        if (!role) throw RestException.notFound('Role not found');

        if (!module_id && !permission_id) throw RestException.badRequest("Module or Permission required");

        if (module_id) {
            if (role.modules.includes(module_id)) {
                // Bor bo‘lsa — olib tashlaymiz
                role.modules = role.modules.filter(id => id !== module_id);
            } else {
                // Yo‘q bo‘lsa — qo‘shamiz
                role.modules.push(module_id);
            }

        } else if (permission_id) {
            if (role.permissions.includes(permission_id)) {
                // Bor bo‘lsa — olib tashlaymiz
                role.permissions = role.permissions.filter(id => id !== permission_id);
            } else {
                // Yo‘q bo‘lsa — qo‘shamiz
                role.permissions.push(permission_id);
            }
        }

        await roleRepository.save(role);

        req.params.id = role_id
        await get_one_role(req, res, next)
    } catch (err) {
        next(err)
    }
}

export const assign_to_user = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {role_id, user_id, assign} = req.body;
        validFields(['user_id', 'role_id', 'assign'], req.body);

        // ROLNI TOPISH
        const role = await roleRepository.findOne({where: {id: role_id, deleted: false}});
        if (!role) throw RestException.notFound('Role not found');

        // FOYDALANUVCHINI TOPISH
        const user = await userRepository.findOne({where: {id: user_id, deleted: false}});
        if (!user) throw RestException.notFound('User not found');


        if (assign === true) {
            user.role_id = role.id;
            await userRepository.save(user)
            res.status(200).json({success: true, message: __('role.success_assigned')});
        } else {
            user.role_id = null;
            await userRepository.save(user)
            res.status(200).json({success: true, message: __('role.success_dis_assigned')});
        }

    } catch (err) {
        next(err);
    }
}

export const get_user_modules = async (role_id: number) => {
    const role = await roleRepository.findOne({where: {id: role_id, deleted: false}});
    if (!role) throw RestException.notFound('Role not found');


    // Barcha modullarni permissions bilan birga olish
    const all_modules = await moduleRepository
        .createQueryBuilder('m')
        .leftJoinAndSelect('m.permissions_list', 'p')
        .where('m.deleted = false')
        .select([
            'm.id',
            'm.name',
            'm.module_id',
            'm.order_index',
            'm.route',
            'p.id',
            'p.name',
            'p.desc',
            'p.module_id',
            'p.module_id',
        ])
        .orderBy('m.order_index', 'ASC')
        .getMany();
    return all_modules
        .filter(m => !m.module_id) // faqat ota modullar
        .map(module => {
            const submodules = all_modules
                .filter(sm => sm.module_id === module.id)
                .map(sm => ({
                    id: sm.id,
                    name: sm.name,
                    check: role.modules.includes(sm.id),
                    order_index: sm.order_index,
                    route: sm.route,
                }));

            return {
                id: module.id,
                name: module.name,
                route: module.route,
                check: role.modules.includes(module.id),
                order_index: module.order_index,
                submodules,
            };
        });

}
// Ota modullarni topish
// const modulesWithSubmodules = modules
//     .filter(m => !m.module_id) // faqat ota modullar
//     .map(module => {
//         const submodules = modules
//             .filter(m => m.module_id === module.id)
//             .map(sm => ({
//                 id: sm.id,
//                 name: sm.name,
//                 order_index: sm.order_index,
//                 permissions: permissions.filter(p => p.module_id === sm.id),
//             }));
//
//         return {
//             id: module.id,
//             name: module.name,
//             order_index: module.order_index,
//             submodules,
//             permissions: permissions.filter(p => p.module_id === module.id),
//
//         };
//     });

