
export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum IssueStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved'
}

export interface AssetHistoryItem {
  id: string;
  date: string;
  type: 'Warranty Start' | 'Repair' | 'Maintenance' | 'Status Change' | 'Assigned';
  description: string;
  performer?: string;
}

export interface Asset {
  id: string;
  name: string;
  warrantyStart: string;
  warrantyEnd: string;
  employeeName: string;
  employeeId: string;
  location: string;
  status: 'Active' | 'Under Repair' | 'Repaired' | 'Retired' | 'Expired';
  photo?: string; // Base64 string or URL
  history?: AssetHistoryItem[];
}

export type RiskProfile = 'Low' | 'Medium' | 'High';

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  serviceType: string;
  rating: number;
  tier: 'Strategic' | 'Preferred' | 'Tactical';
  sla: number; // Percentage (e.g., 99.9)
  riskProfile: RiskProfile;
  isCompliant: boolean;
}

export interface BMSIssue {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: Priority;
  status: IssueStatus;
  issueDate: string;
  issueEndDate?: string;
  facilityCategory: 'MEP Systems' | 'Environmental Control' | 'Life Safety' | 'Critical Power' | 'Civil & Structural';
  photo?: string; // Evidence documentation
}

export type VisitorType = 'General' | 'Vendor' | 'Interview';

export interface Visitor {
  id: string;
  name: string;
  idProofType: string;
  idProof: string;
  purpose: string;
  hostName: string;
  checkIn: string;
  checkOut?: string;
  type: VisitorType;
  photo?: string;
  resume?: string; // FileName or indicator
}

export type View = 'dashboard' | 'assets' | 'vendors' | 'bms' | 'visitors';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  role: UserRole;
  fullName: string;
}
