import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {validFields} from "../utils/CustomErrors";
import bcrypt from "bcrypt";
import {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import {download_file_create_attachment} from "./AttachmentController";

const userRepository = AppDataSource.getRepository(User);
const JWT_SECRET = process.env.JWT_KEY || "dshakjfhdfs678g56d678gt98df";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {phone, password} = req.body;

        // Kerakli maydonlarni tekshirish
        validFields(["phone", "password"], req.body);

        // Telefon raqamini tekshirish (+ bilan boshlanishi shart)
        if (!phone.startsWith("+")) {
            res.status(400).json({message: "Telefon raqami + bilan boshlanishi shart!"});
            return;
        }

        // Foydalanuvchi mavjudligini tekshirish
        const existsUser = await userRepository.exists({where: {phone_number: phone, deleted:false}});

        if (existsUser) {
            res.status(400).json({message: "Foydalanuvchi allaqachon mavjud"});
            return;
        }

        // Parolni hash qilish
        const hashedPassword = await bcrypt.hash(String(password), 10);

        // Yangi foydalanuvchi yaratish
        const newUser = userRepository.create({
            phone_number: phone,
            password: hashedPassword,
        });

        await userRepository.save(newUser);

        res.status(201).json({message: "Foydalanuvchi muvaffaqiyatli yaratildi", success: true});

    } catch (err) {
        next(err);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {password, username} = req.body;

        // 1. Kerakli maydonlarni tekshirish
        validFields(["password", "username"], req.body);

        // 2. Foydalanuvchini topish
        const user = await userRepository.findOne({where: {phone_number: username, deleted:false}});
        console.log(user)
        if (!user && user===null) {
            res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
            return;
        }

        // 3. Parolni tekshirish
        // if (!password || !user.password) {
        //     res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
        //     return;
        // }

        // const isPasswordValid = await bcrypt.compare(String(password), user.password);
        // if (!isPasswordValid) {
        //     res.status(401).json({message: "Foydalanuvchi yoki parol noto‘g‘ri!", success: false});
        //     return;
        // }

        // 4. JWT token yaratish
        if (!JWT_SECRET) {
            res.status(500).json({message: "Serverda muammo bor. Iltimos, keyinroq urinib ko‘ring.", success: false});
            return;
        }

        const token = jwt.sign(
            {
                id: user.id,
                phone_number: user.phone_number,
            },
            JWT_SECRET
        );

        // 5. Javob qaytarish
        res.status(200).json({
            success: true,
            message: "Muvaffaqiyatli login!",
            token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
            },
        });
    } catch (err) {
        next(err); // Xatolikni keyingi middleware-ga yuborish
    }
};
export const login_tg = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const {id, first_name, last_name, username, photo_url} = req.body;
        validFields(['id', 'first_name', 'photo_url'], req.body);

        let user = await userRepository.findOne({where: {chat_id: id,deleted:false}});
        if (!user) {
            user = await userRepository.save({
                chat_id: id,
                first_name: first_name,
                last_name: last_name,
                is_bot_user:true
            })
        }
        if (user.first_name !== first_name)
            user.first_name = first_name;

        if (user.last_name !== last_name)
            user.last_name = last_name;

        if (photo_url) {
            user.logo_id = photo_url;
        }

       await userRepository.save(user)
        if (!JWT_SECRET) {
            res.status(500).json({message: "Serverda muammo bor. Iltimos, keyinroq urinib ko‘ring.", success: false});
            return;
        }


        const token = jwt.sign(
            {
                id: user.id,
                phone_number: user.phone_number,
            },
            JWT_SECRET
        );
        res.status(200).json({
            success: true,
            message: "Muvaffaqiyatli login!",
            token,
            user: {
                id: user.id,
                phone_number: user.phone_number,
            },
        });
    } catch (err) {
        next(err)
    }
}


// export const payme_login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//     try {
//         const {username, password, user_id} = req.body;
//
//         // Majburiy parametrlarni tekshirish
//         if (username == null || password == null || user_id == null) {
//             throw RestException.badRequest("username, user_id and password are required");
//         }
//
//         // paymeRepository orqali foydalanuvchini qidirish
//         const payme = await getPaymeUserId(user_id);
//         if (!payme) {
//             throw RestException.badRequest("Payme not found");
//         }
//
//         payme.password = password;
//         payme.phone_number = username;
//         // paymeLogin funktsiyasi yordamida login qilish
//         const loginResponse = await paymeLogin({
//             params: {
//                 'login': username,
//                 'password': password,
//             },
//             'method': 'users.log_in',
//         }, null, payme);
//
//         const resSms: any = await axios.post(process.env.PAYME_URL + 'sessions.get_activation_code', {
//             method: 'sessions.get_activation_code'
//         }, {
//             headers: {
//                 'API-SESSION': loginResponse.headers['api-session']
//             }
//         })
//         res.json(resSms.data.result);
//
//     } catch (error) {
//         next(error); // Xatoni keyingi middleware-ga uzatish
//     }
// }

const paymeLogin = async (body: any, headers: any, payme: any) => {
    const config = {
        headers: {
            'Content-Type': 'text/plain',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            ...headers
        }
    };

    // Payme API-ga POST so'rovi yuborish
    const login = await axios.post(`${process.env.PAYME_URL}users.log_in`, body, config);

    // Payme ma'lumotlarini yangilash va saqlash
    payme.is_active_session = payme.device != null;
    payme.session = login.headers['api-session'];

    return login;
};
