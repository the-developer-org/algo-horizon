import { toast } from 'react-hot-toast';

export interface UserProfile {
    id: string;
    phoneNumber: number;
    name: string;
    email: string;
    group: string;
    tokenId: string | null;
    sandBoxTokenId: string | null;
    pin: number | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const algoHorizonApi = {
    /**
     * Fetch all users from the backend
     * @returns Promise<UserProfile[]>
     */
    getAllUsers: async (): Promise<UserProfile[]> => {
        try {
            const resp = await fetch(`${BASE_URL}/api/user/get-all-users`);
            if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
            const data = await resp?.json();

            const usersArray = Array.isArray(data) ? data : data.userProfiles || [];

            // Remove duplicates based on phone number
            const uniqueUsers = usersArray.filter((user: UserProfile, index: number, self: UserProfile[]) =>
                index === self.findIndex((u: UserProfile) => u.phoneNumber === user.phoneNumber)
            );

            return uniqueUsers;
        } catch (error: any) {
            console.error('Failed to fetch users:', error);
            throw new Error(error.message || 'Failed to load users');
        }
    },

    /**
     * Get phone number mapping for all users
     * @returns Promise<Record<string, string>>
     */
    getUserPhoneMapping: async (): Promise<Record<string, string>> => {
        try {
            const users = await algoHorizonApi.getAllUsers();
            return users.reduce((acc, user) => {
                if (user.name && user.phoneNumber) {
                    acc[user.name] = String(user.phoneNumber);
                }
                return acc;
            }, {} as Record<string, string>);
        } catch (error: any) {
            console.error('Failed to get phone mapping:', error);
            throw new Error(error.message || 'Failed to load phone mapping');
        }
    },

    /**
     * Store token for a user
     * @param phoneNumber User's phone number
     * @param tokenId Token to store
     * @returns Promise<void>
     */
    storeToken: async (phoneNumber: string, tokenId: string): Promise<void> => {
        try {
            const response = await fetch(`${BASE_URL}/api/user/store-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber, tokenId }),
            });

            if (!response.ok) {
                throw new Error('Failed to store token');
            }
        } catch (error: any) {
            console.error('Token storage failed:', error);
            throw new Error(error.message || 'Failed to store token');
        }
    },

    /**
     * Check if a user has an available token
     * @param phoneNumber User's phone number
     * @returns Promise<boolean>
     */
    checkTokenAvailability: async (phoneNumber: string): Promise<boolean> => {
        try {
            const response = await fetch(`${BASE_URL}/api/user/is-token-available?phoneNumber=${phoneNumber}`);
            const data = await response.json();
            return data.isTokenAvailable;
        } catch (error) {
            console.error('Error checking token:', error);
            return false;
        }
    },

    fetchPhoneMapping: async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8090';
            const response = await fetch(`${backendUrl}/api/user/get-all-users-phone-mapping`);
            debugger
            if (response.ok) {
                const data = await response.json();

                return data.phoneNumberMap;
            } else {
                console.error('Failed to fetch phone number mapping:', await response.text());
            }
        } catch (error) {
            console.error('Error fetching phone number mapping:', error);
        }
    }
};