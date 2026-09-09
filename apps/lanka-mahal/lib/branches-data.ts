/** Branch locations — source of truth for footer, branches page, and pickup centers. */

export interface BranchLocation {
  id: string;
  name: string;
  city: string;
  region: string;
  address: string;
  phone: string;
  hours: string;
  headOffice: boolean;
}

export const lankaMahalBranches: BranchLocation[] = [
  {
    id: 'modara',
    name: 'Head Office (Modara)',
    city: 'Colombo 15',
    region: 'Western',
    address: '40B, St Jems Street, Modara, Colombo 15, Sri Lanka',
    phone: '074 030 0976 / 077 839 3974 / 011 252 5398',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: true,
  },
  {
    id: 'jaffna',
    name: 'Jaffna',
    city: 'Jaffna',
    region: 'North',
    address: '40, Kannathiddy Road, Jaffna, Sri Lanka',
    phone: '077 839 3974 / 077 158 0268 / 021 221 0153',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'kilinochchi',
    name: 'Kilinochchi',
    city: 'Kilinochchi',
    region: 'North',
    address: '56/B, A9 Road, Ananthapuram, Kilinochchi, Sri Lanka',
    phone: '074 194 3697 / 077 839 3974 / 021 228 2848',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'vavuniya',
    name: 'Vavuniya',
    city: 'Vavuniya',
    region: 'North',
    address: '65, 2nd Cross Street, Vavuniya, Sri Lanka',
    phone: '074 074 7804 / 077 839 3974 / 024 222 6566',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'trincomalee',
    name: 'Trincomalee',
    city: 'Trincomalee',
    region: 'East',
    address: '361B, Power House Road, Trincomalee, Sri Lanka',
    phone: '074 194 3678 / 077 839 3974 / 026 222 8285',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'mullaitivu',
    name: 'Mullaitivu',
    city: 'Mullaitivu',
    region: 'North',
    address: 'Paranthan Road, Putukudiyiruppu, Mullaitivu, Sri Lanka',
    phone: '074 194 3699 / 077 839 3974 / 021 229 0410',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'mannar',
    name: 'Mannar',
    city: 'Mannar',
    region: 'North',
    address: "St. Sebastian's Street, Hospital Road, Mannar, Sri Lanka",
    phone: '074 074 7661 / 077 839 3974 / 023 222 3687',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    id: 'batticaloa',
    name: 'Batticaloa',
    city: 'Batticaloa',
    region: 'East',
    address: '569, Trinco Road, Batticaloa, Sri Lanka',
    phone: '074 194 3698 / 077 839 3974 / 065 222 7995',
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
];

export function getHeadOffice(): BranchLocation {
  return lankaMahalBranches.find((b) => b.headOffice) ?? lankaMahalBranches[0]!;
}
