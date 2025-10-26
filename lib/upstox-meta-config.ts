// WhatsApp configuration

interface WhatsAppConfig {
  userPhoneNumbers: Record<string, string>;
}

const whatsappConfig: WhatsAppConfig = {
  userPhoneNumbers: {
    "Nawaz": "+918008752702",
    "Sadiq": "+917036592824",
    "Abrar": "+918885615779",
  },
};

interface UpstoxBaseConfig{
  redirect_url : string | undefined,
  client_id : string | undefined,
  client_secret : string | undefined
}

interface UpstoxUserConfig{
  8885615779 : UpstoxBaseConfig,
  7036592824 : UpstoxBaseConfig,
  8008752702 : UpstoxBaseConfig,
  9154460026 : UpstoxBaseConfig
}

const upstoxUserConfig: UpstoxUserConfig = {
 8885615779 : {
  redirect_url : process.env.UPSTOX_REDIRECT_URL_8885615779,
  client_id : process.env.UPSTOX_CLIENT_ID_8885615779,
  client_secret : process.env.UPSTOX_CLIENT_SECRET_8885615779
 }, 
 7036592824 : {
  redirect_url : process.env.UPSTOX_REDIRECT_URL_7036592824,
  client_id : process.env.UPSTOX_CLIENT_ID_7036592824,
  client_secret : process.env.UPSTOX_CLIENT_SECRET_7036592824
 }, 
 8008752702 : {
  redirect_url : process.env.UPSTOX_REDIRECT_URL_8008752702,
  client_id : process.env.UPSTOX_CLIENT_ID_8008752702,
  client_secret : process.env.UPSTOX_CLIENT_SECRET_8008752702
 }, 
 9154460026 : {
  redirect_url : process.env.UPSTOX_REDIRECT_URL_9154460026,
  client_id : process.env.UPSTOX_CLIENT_ID_9154460026,
  client_secret : process.env.UPSTOX_CLIENT_SECRET_9154460026
 }, 

};

export { upstoxUserConfig, whatsappConfig };