/**
 * OCPI 2.2.1 Token Module Enums
 * Based on specification section 12.4
 */

/**
 * AllowedType enum - Status of authorization
 * OCPI spec 12.4.1
 */
export enum AllowedType {
  ALLOWED = 'ALLOWED',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
  NO_CREDIT = 'NO_CREDIT',
  NOT_ALLOWED = 'NOT_ALLOWED',
}

/**
 * TokenType enum - Type of token
 * OCPI spec 12.4.4
 */
export enum TokenType {
  AD_HOC_USER = 'AD_HOC_USER',
  APP_USER = 'APP_USER',
  OTHER = 'OTHER',
  RFID = 'RFID',
}

/**
 * WhitelistType enum - Authorization requirements
 * OCPI spec 12.4.5
 */
export enum WhitelistType {
  ALWAYS = 'ALWAYS',
  ALLOWED = 'ALLOWED',
  ALLOWED_OFFLINE = 'ALLOWED_OFFLINE',
  NEVER = 'NEVER',
}
