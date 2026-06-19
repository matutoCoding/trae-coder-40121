export interface VaccinationStation {
  id: string;
  name: string;
  location: string;
  capacityPerSlot: number;
  workStartTime: string;
  workEndTime: string;
  slotDuration: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Vaccine {
  id: string;
  name: string;
  manufacturer: string;
  dosage: string;
  description: string;
}

export interface VaccineBatch {
  id: string;
  vaccineId: string;
  vaccineName: string;
  batchNo: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  usedQuantity: number;
  status: 'normal' | 'recalled' | 'expired';
  remark?: string;
  createdAt: string;
}

export interface AppointmentSlot {
  id: string;
  stationId: string;
  stationName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalCapacity: number;
  bookedCount: number;
  vaccineId: string;
  vaccineName: string;
  status: 'available' | 'full' | 'closed';
}

export interface Appointment {
  id: string;
  slotId: string;
  stationId: string;
  stationName: string;
  vaccineId: string;
  vaccineName: string;
  date: string;
  startTime: string;
  endTime: string;
  patientName: string;
  idCard: string;
  phone: string;
  status: 'booked' | 'checked_in' | 'vaccinated' | 'observed' | 'completed' | 'cancelled' | 'no_show';
  checkInTime?: string;
  vaccinationTime?: string;
  observationStartTime?: string;
  observationEndTime?: string;
  batchId?: string;
  batchNo?: string;
  createdAt: string;
}

export interface WaitlistItem {
  id: string;
  stationId: string;
  stationName: string;
  vaccineId: string;
  vaccineName: string;
  date: string;
  patientName: string;
  idCard: string;
  phone: string;
  priority: number;
  status: 'waiting' | 'notified' | 'confirmed' | 'cancelled' | 'expired';
  notifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface VaccinationRecord {
  id: string;
  appointmentId: string;
  patientName: string;
  idCard: string;
  phone: string;
  vaccineId: string;
  vaccineName: string;
  batchId: string;
  batchNo: string;
  stationId: string;
  stationName: string;
  vaccinationTime: string;
  observationStartTime: string;
  observationEndTime: string;
  status: 'normal' | 'adverse_reaction' | 'recalled';
  adverseReaction?: string;
}

export interface RecallRecord {
  id: string;
  batchId: string;
  batchNo: string;
  vaccineId: string;
  vaccineName: string;
  reason: string;
  affectedCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface Notification {
  id: string;
  type: 'waitlist' | 'recall' | 'observation' | 'system';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}
