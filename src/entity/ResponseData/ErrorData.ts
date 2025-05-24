export class ErrorData {
    constructor(userMsg: string, errorCode: number) {
        this.error_msg=userMsg;
        this.errorCode = errorCode;
    }

    //USERGA BORADIGAN XABAR
    error_msg!: string;

    //QAYSI FIELD XATO EKANLIGI
    field_name!: string;

    //XATOLIK KODI
    errorCode!: number


}