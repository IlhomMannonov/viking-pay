import {NextFunction, Request, Response} from 'express';
import dotenv from 'dotenv';

import crypto from "crypto";
import {RestException} from "./RestException";
import jwt from "jsonwebtoken";
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {AuthenticatedRequest, IUser} from "../entity/custom/AuthenticatedRequest";
import {Permission} from "../entity/Permission";
import {Role} from "../entity/Role";

dotenv.config();
const userRepository = AppDataSource.getRepository(User);
const permissionRepository = AppDataSource.getRepository(Permission);
const roleRepository = AppDataSource.getRepository(Role);


// Secret keyni saqlaydigan fayl (config fayl)
export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({message: "Token taqdim etilmagan."});
    }

    try {
        if (!process.env.GAME_ACCESS_ID) {
            throw new Error("GAME_ACCESS_ID muhit o‘zgaruvchisi mavjud emas.");
        }

        const access = await verifyHash(process.env.GAME_ACCESS_ID, token)

        if (!access) {
            throw RestException.restThrow("Unauthorized", 401);
        }
        next(); // Keyingi middleware yoki controllerga o'tkazish
    } catch (error) {
        return res.status(401).json({message: "Noto‘g‘ri yoki amal qilish muddati tugagan token."});
    }
}
export const verifyJwtToken = (permission: string | null = null) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const token = req.headers['authorization'];

        if (!token) {
            return res.status(403).json({message: "Token taqdim etilmagan."});
        }

        const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

        const decodedToken = decodeJwtToken(actualToken) as IUser | null;
        if (!decodedToken) {
            return res.status(403).json({message: "Token yaroqsiz"});
        }

        const user = await userRepository.findOne({where: {id: decodedToken.id, deleted: false}});
        if (!user) return res.status(403).json({message: "Token yaroqsiz"});

        user.last_login_time = new Date();
        req.user = user;

        await userRepository.save(user);

        // ✅ Agar super admin bo‘lsa, boshqa kodlar ishlamasin
        if (user.super_admin) return next();

        // PERMISSION tekshirish
        if (permission) {
            const role = await roleRepository.findOne({where: {id: Number(user.role_id)}});
            if (!role) return res.status(403).json({message: "Ruxsat yo‘q"});

            const permission_ids = role.permissions;
            const pm = await permissionRepository.findOne({where: {name: permission, deleted: false}, select: ['id']});
            if (!pm) return res.status(403).json({message: "Ruxsat yo‘q"});

            const hasPermission = permission_ids.includes(pm.id);
            if (!hasPermission) return res.status(403).json({message: "Ruxsat yo‘q"});
        }

        next(); // ✅ faqat barcha tekshiruvlardan o‘tgan bo‘lsa
    };

};

export function createToken(payload: any) {
    if (!process.env.JWT_KEY) {
        throw new Error("JWT_KEY muhit o‘zgaruvchisi mavjud emas.");
    }
    // Token yaratish (muddat cheklanmagan)
    return jwt.sign(payload, process.env.JWT_KEY);
}

export function decodeJwtToken(token: string) {
    try {
        if (!process.env.JWT_KEY) {
            throw new Error("JWT_KEY muhit o‘zgaruvchisi mavjud emas.");
        }
        // Tokenni dekodlash va tasdiqlash
        return jwt.verify(token, process.env.JWT_KEY); // Dekodlangan ma'lumotni qaytaradi
    } catch (error) {
        // Token noto'g'ri yoki muddati o'tgan bo'lsa, xato qaytaradi
        return null;
    }
}


async function hashWithSHA256(message: string) {
    const msgBuffer = new TextEncoder().encode(message); // Message ni UTF-8 ga o'giradi
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer); // SHA-256 orqali hash qiladi
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // Hash ni baytlarga o'giradi
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // Hash ni 16-lik satrga o'giradi
}

async function verifyHash(message: string, hash: string) {
    const messageHash = await hashWithSHA256(message);
    return messageHash === hash; // True agar mos bo'lsa
}
