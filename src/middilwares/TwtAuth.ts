import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // Token yo'q bo'lsa, kirish rad etiladi

    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string, (err, user) => {
    //     if (err) return res.sendStatus(403); // Token yaroqsiz bo'lsa, kirish rad etiladi
    //     req.user = user as JwtPayload; // Token muvaffaqiyatli tekshirildi, foydalanuvchi ma'lumotlari saqlanadi
    //     next(); // Keyingi middleware yoki marshrutga o'tish
    // });
};

export default authenticateToken;
