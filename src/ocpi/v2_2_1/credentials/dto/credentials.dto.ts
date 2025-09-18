// ocpi/v2_2_1/credentials/dto/credentials.dto.ts
export type CredentialsRoleDto = Readonly<{
  role: 'CPO' | 'EMSP' | 'HUB'
  party_id: string
  country_code: string
  business_details?: Readonly<{
    name: string
    website?: string
    logo?: Readonly<{
      url: string
      thumbnail?: string
      category?: string
      type?: string
      width?: number
      height?: number
    }>
  }>
}>

export type CredentialsDto = Readonly<{
  token: string // printable ASCII, sent Base64-encoded in header when used
  url: string // absolute /versions URL
  roles: readonly CredentialsRoleDto[]
}>
