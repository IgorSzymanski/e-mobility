export type PartyRole = 'CPO' | 'EMSP' | 'HUB'
export type OcpiVersion = '2.2.1' | '2.3.0'

export interface Peer {
  readonly id: string // surrogate
  readonly countryCode: string // e.g., "PL"
  readonly partyId: string // e.g., "IGI"
  readonly roles: ReadonlyArray<PartyRole>
  readonly baseVersionsUrl: string // their /versions URL
  readonly ourTokenForPeer: string // B: token we use when calling them
  readonly peerTokenForUs: string // C: token they use when calling us
  readonly chosenVersion: OcpiVersion
  readonly status: 'REGISTERED' | 'PENDING' | 'REVOKED'
  readonly lastUpdated: string
}
