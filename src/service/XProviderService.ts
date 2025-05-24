import axios, {AxiosResponse} from 'axios';
import crypto from 'crypto';
import dayjs from 'dayjs';
import qs from 'querystring';

interface CashDeskSettings {
    hash: string;
    cashierpass: string;
    login: string;
    cashdeskid: string;
}

interface ApiResponse {
    CurrencyId?: number;

    [key: string]: any;
}

export class CashDesk {
    private baseUrl: string;

    private static settings: Record<string, Partial<CashDeskSettings>> = {
        xbet: {
            hash: '548bcd1b2b224936b9d72b08b754073d3f8c222f42df1b1124e5cb9ab73bc085',
            cashierpass: 'QMpwzVqyJx',
            login: 'Norchay_Atxam',
            cashdeskid: '1129675'
        },
        betandyou: {}
    };

    private hash: string;
    private cashierpass: string;
    private login: string;
    private cashdeskid: string;

    constructor(baseUrl: string, hash: string, cashierpass: string, login: string, cashdeskid: string) {
        this.hash = hash;
        this.cashierpass = cashierpass;
        this.login = login;
        this.cashdeskid = cashdeskid;
        this.baseUrl = baseUrl;

    }


    private sha256(str: string): string {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    private md5(str: string): string {
        return crypto.createHash('md5').update(str).digest('hex');
    }

    private calcSignatureSearch(userId: string): string {
        const step1 = this.sha256(`hash=${this.hash}&userid=${userId}&cashdeskid=${this.cashdeskid}`);
        const step2 = this.md5(`userid=${userId}&cashierpass=${this.cashierpass}&hash=${this.hash}`);
        return this.sha256(step1 + step2);
    }

    private calcSignatureBalance(dt: string): string {
        const step1 = this.sha256(`hash=${this.hash}&cashierpass=${this.cashierpass}&dt=${dt}`);
        const step2 = this.md5(`dt=${dt}&cashierpass=${this.cashierpass}&cashdeskid=${this.cashdeskid}`);
        return this.sha256(step1 + step2);
    }

    private calcSignatureDeposit(userId: string, summa: number): string {
        const step1 = this.sha256(`hash=${this.hash}&lng=ru&userid=${userId}`);
        const step2 = this.md5(`summa=${summa}&cashierpass=${this.cashierpass}&cashdeskid=${this.cashdeskid}`);
        return this.sha256(step1 + step2);
    }

    private calcSignaturePay(userId: string, code: string): string {
        const step1 = this.sha256(`hash=${this.hash}&lng=ru&userid=${userId}`);
        const step2 = this.md5(`code=${code}&cashierpass=${this.cashierpass}&cashdeskid=${this.cashdeskid}`);
        return this.sha256(step1 + step2);
    }

    private async sendRequest(url: string, signature: string, data: Record<string, any> = {}, post = false): Promise<ApiResponse | null> {
        const headers = {
            sign: signature,
            'Content-Type': 'application/json'
        };

        const fullUrl = this.baseUrl + url;

        try {
            let response: AxiosResponse<ApiResponse>;
            if (post) {
                response = await axios.post(fullUrl, data, {headers});
            } else {
                const query = qs.stringify(data);
                response = await axios.get(fullUrl + query, {headers});
            }
            return response.data;
        } catch (error: any) {
            console.error('Request error:', error?.response?.data || error.message);
            return null;
        }
    }

    public async deposit(userId: string, summa: number): Promise<ApiResponse | null> {
        const url = `/Deposit/${userId}/Add`;
        const data = {
            cashdeskId: this.cashdeskid,
            lng: 'ru',
            summa,
            confirm: this.md5(`${userId}:${this.hash}`)
        };
        return await this.sendRequest(url, this.calcSignatureDeposit(userId, summa), data, true);
    }

    public async payout(userId: string, code: string): Promise<ApiResponse | null> {
        const url = `/Deposit/${userId}/Payout`;
        const data = {
            cashdeskId: this.cashdeskid,
            lng: 'ru',
            code,
            confirm: this.md5(`${userId}:${this.hash}`)
        };
        return await this.sendRequest(url, this.calcSignaturePay(userId, code), data, true);
    }

    public async getBalance(): Promise<ApiResponse | null> {
        const dt = dayjs().format('YY:MM:DD HH:mm:ss');
        const url = `/Cashdesk/${this.cashdeskid}/Balance?`;
        const data = {
            dt,
            confirm: this.md5(`${this.cashdeskid}:${this.hash}`)
        };
        return await this.sendRequest(url, this.calcSignatureBalance(dt), data);
    }

    public async searchPlayer(userId: string): Promise<ApiResponse | null> {
        const url = `/Users/${userId}?`;
        const data = {
            confirm: this.md5(`${userId}:${this.hash}`),
            cashdeskId: this.cashdeskid
        };
        const response = await this.sendRequest(url, this.calcSignatureSearch(userId), data);
        if (response?.CurrencyId !== 87) return null;
        return response;
    }

    public async checkProvider(): Promise<boolean> {
        const balanceInfo = await this.getBalance();
        return balanceInfo !== null && typeof balanceInfo === 'object';
    }

}


