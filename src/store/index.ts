import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type {
  VaccinationStation,
  Vaccine,
  VaccineBatch,
  AppointmentSlot,
  Appointment,
  WaitlistItem,
  VaccinationRecord,
  RecallRecord,
  Notification,
} from '../types';

interface AppState {
  stations: VaccinationStation[];
  vaccines: Vaccine[];
  batches: VaccineBatch[];
  slots: AppointmentSlot[];
  appointments: Appointment[];
  waitlist: WaitlistItem[];
  records: VaccinationRecord[];
  recalls: RecallRecord[];
  notifications: Notification[];
  observationTimers: { appointmentId: string; endTime: string }[];

  addStation: (station: Omit<VaccinationStation, 'id' | 'createdAt'>) => void;
  updateStation: (id: string, data: Partial<VaccinationStation>) => void;
  deleteStation: (id: string) => void;

  addVaccine: (vaccine: Omit<Vaccine, 'id'>) => void;
  updateVaccine: (id: string, data: Partial<Vaccine>) => void;
  deleteVaccine: (id: string) => void;

  addBatch: (batch: Omit<VaccineBatch, 'id' | 'usedQuantity' | 'status' | 'createdAt'>) => void;
  updateBatch: (id: string, data: Partial<VaccineBatch>) => void;
  deleteBatch: (id: string) => void;
  recallBatch: (id: string, reason: string) => void;
  checkBatchExpiry: () => void;

  generateSlots: (stationId: string, date: string, vaccineId: string) => void;
  getSlotsByDate: (date: string) => AppointmentSlot[];
  recalcSlotStatus: (slotId: string) => void;

  createAppointment: (data: {
    slotId: string;
    patientName: string;
    idCard: string;
    phone: string;
  }) => Appointment | null;
  cancelAppointment: (id: string) => void;
  checkInAppointment: (id: string) => void;
  vaccinateAppointment: (id: string, batchId: string) => void;
  startObservation: (id: string) => void;
  completeObservation: (id: string) => void;
  noShowAppointment: (id: string) => void;

  addWaitlist: (data: {
    stationId: string;
    vaccineId: string;
    date: string;
    slotId?: string;
    patientName: string;
    idCard: string;
    phone: string;
  }) => void;
  cancelWaitlist: (id: string) => void;
  processWaitlistForSlot: (slotId: string) => WaitlistItem | null;
  confirmWaitlist: (id: string) => Appointment | null;
  declineWaitlist: (id: string) => void;
  expireWaitlistNotifications: () => void;
  getWaitlistCountForSlot: (slotId: string) => { waiting: number; notified: number };
  getAvailableCountForSlot: (slotId: string) => number;

  completeObservationWithResult: (
    id: string,
    result: 'normal' | 'abnormal' | 'urgent',
    note?: string
  ) => void;
  checkInventoryAlerts: () => { expiringBatches: VaccineBatch[]; lowStockVaccines: { vaccineId: string; vaccineName: string; remaining: number; threshold: number; suggestOrder: number }[] };

  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  addObservationTimer: (appointmentId: string, durationMinutes: number) => void;
  removeObservationTimer: (appointmentId: string) => void;

  getRecordsByBatch: (batchId: string) => VaccinationRecord[];
  searchRecords: (keyword: string) => VaccinationRecord[];
  createRecall: (batchId: string, reason: string) => void;
}

const initialVaccines: Vaccine[] = [
  { id: uuidv4(), name: '乙肝疫苗', manufacturer: '深圳康泰', dosage: '20μg/0.5ml', description: '重组乙型肝炎疫苗' },
  { id: uuidv4(), name: '流感疫苗', manufacturer: '赛诺菲', dosage: '0.5ml', description: '四价流感病毒裂解疫苗' },
  { id: uuidv4(), name: 'HPV九价疫苗', manufacturer: '默沙东', dosage: '0.5ml', description: '九价人乳头瘤病毒疫苗' },
  { id: uuidv4(), name: '肺炎疫苗', manufacturer: '辉瑞', dosage: '0.5ml', description: '23价肺炎球菌多糖疫苗' },
];

const initialStations: VaccinationStation[] = [
  {
    id: uuidv4(),
    name: '1号接种台',
    location: '一楼大厅东侧',
    capacityPerSlot: 2,
    workStartTime: '08:00',
    workEndTime: '17:00',
    slotDuration: 30,
    status: 'active',
    createdAt: dayjs().toISOString(),
  },
  {
    id: uuidv4(),
    name: '2号接种台',
    location: '一楼大厅西侧',
    capacityPerSlot: 2,
    workStartTime: '08:00',
    workEndTime: '17:00',
    slotDuration: 30,
    status: 'active',
    createdAt: dayjs().toISOString(),
  },
  {
    id: uuidv4(),
    name: '3号接种台',
    location: '二楼南侧',
    capacityPerSlot: 1,
    workStartTime: '09:00',
    workEndTime: '16:00',
    slotDuration: 30,
    status: 'active',
    createdAt: dayjs().toISOString(),
  },
];

function computeSlotStatus(slot: AppointmentSlot): 'available' | 'full' | 'closed' {
  if (slot.bookedCount >= slot.totalCapacity) return 'full';
  if (slot.bookedCount < slot.totalCapacity) return 'available';
  return slot.status;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stations: initialStations,
      vaccines: initialVaccines,
      batches: [],
      slots: [],
      appointments: [],
      waitlist: [],
      records: [],
      recalls: [],
      notifications: [],
      observationTimers: [],

      addStation: (station) =>
        set((state) => ({
          stations: [...state.stations, { ...station, id: uuidv4(), createdAt: dayjs().toISOString() }],
        })),

      updateStation: (id, data) =>
        set((state) => ({
          stations: state.stations.map((s) => (s.id === id ? { ...s, ...data } : s)),
        })),

      deleteStation: (id) =>
        set((state) => ({
          stations: state.stations.filter((s) => s.id !== id),
        })),

      addVaccine: (vaccine) =>
        set((state) => ({
          vaccines: [...state.vaccines, { ...vaccine, id: uuidv4() }],
        })),

      updateVaccine: (id, data) =>
        set((state) => ({
          vaccines: state.vaccines.map((v) => (v.id === id ? { ...v, ...data } : v)),
        })),

      deleteVaccine: (id) =>
        set((state) => ({
          vaccines: state.vaccines.filter((v) => v.id !== id),
        })),

      addBatch: (batch) => {
        const isExpired = dayjs(batch.expiryDate).isBefore(dayjs().startOf('day'));
        set((state) => ({
          batches: [
            ...state.batches,
            {
              ...batch,
              id: uuidv4(),
              usedQuantity: 0,
              status: isExpired ? 'expired' : 'normal',
              createdAt: dayjs().toISOString(),
            },
          ],
        }));

        if (isExpired) {
          get().addNotification({
            type: 'system',
            title: '过期批次入库提醒',
            content: `批次 ${batch.batchNo}（${batch.vaccineName}）已过期，不可用于接种`,
          });
        }
      },

      updateBatch: (id, data) =>
        set((state) => ({
          batches: state.batches.map((b) => (b.id === id ? { ...b, ...data } : b)),
        })),

      deleteBatch: (id) =>
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        })),

      checkBatchExpiry: () => {
        const today = dayjs().startOf('day');
        const expiredIds: string[] = [];
        set((state) => ({
          batches: state.batches.map((b) => {
            if (b.status === 'normal' && dayjs(b.expiryDate).isBefore(today)) {
              expiredIds.push(b.id);
              return { ...b, status: 'expired' as const };
            }
            return b;
          }),
        }));
        if (expiredIds.length > 0) {
          get().addNotification({
            type: 'system',
            title: '批次过期通知',
            content: `${expiredIds.length} 个批次已过有效期，已自动归入过期分类，不可用于接种`,
          });
        }
      },

      recallBatch: (id, reason) => {
        const batch = get().batches.find((b) => b.id === id);
        if (!batch) return;

        const affectedRecords = get().records.filter((r) => r.batchId === id);

        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id ? { ...b, status: 'recalled' as const } : b
          ),
          records: state.records.map((r) =>
            r.batchId === id ? { ...r, status: 'recalled' as const } : r
          ),
          recalls: [
            ...state.recalls,
            {
              id: uuidv4(),
              batchId: id,
              batchNo: batch.batchNo,
              vaccineId: batch.vaccineId,
              vaccineName: batch.vaccineName,
              reason,
              affectedCount: affectedRecords.length,
              status: 'in_progress',
              createdAt: dayjs().toISOString(),
            },
          ],
        }));

        get().addNotification({
          type: 'recall',
          title: '疫苗召回通知',
          content: `批次 ${batch.batchNo}（${batch.vaccineName}）已启动召回，共影响 ${affectedRecords.length} 人`,
        });
      },

      generateSlots: (stationId, date, vaccineId) => {
        const station = get().stations.find((s) => s.id === stationId);
        const vaccine = get().vaccines.find((v) => v.id === vaccineId);
        if (!station || !vaccine) return;

        const start = dayjs(`${date} ${station.workStartTime}`);
        const end = dayjs(`${date} ${station.workEndTime}`);
        const newSlots: AppointmentSlot[] = [];

        let current = start;
        while (current.isBefore(end)) {
          const slotEnd = current.add(station.slotDuration, 'minute');
          if (slotEnd.isAfter(end)) break;

          newSlots.push({
            id: uuidv4(),
            stationId: station.id,
            stationName: station.name,
            date,
            startTime: current.format('HH:mm'),
            endTime: slotEnd.format('HH:mm'),
            totalCapacity: station.capacityPerSlot,
            bookedCount: 0,
            vaccineId: vaccine.id,
            vaccineName: vaccine.name,
            status: 'available',
          });

          current = slotEnd;
        }

        const existingSlotIds = get()
          .slots.filter((s) => s.stationId === stationId && s.date === date && s.vaccineId === vaccineId)
          .map((s) => s.id);

        set((state) => ({
          slots: [...state.slots.filter((s) => !existingSlotIds.includes(s.id)), ...newSlots],
        }));
      },

      getSlotsByDate: (date) => {
        return get().slots.filter((s) => s.date === date);
      },

      recalcSlotStatus: (slotId) => {
        set((state) => ({
          slots: state.slots.map((s) =>
            s.id === slotId ? { ...s, status: computeSlotStatus(s) } : s
          ),
        }));
      },

      createAppointment: (data) => {
        const slot = get().slots.find((s) => s.id === data.slotId);
        if (!slot) return null;
        const availableCount = get().getAvailableCountForSlot(data.slotId);
        if (availableCount <= 0) return null;

        const appointment: Appointment = {
          id: uuidv4(),
          slotId: slot.id,
          stationId: slot.stationId,
          stationName: slot.stationName,
          vaccineId: slot.vaccineId,
          vaccineName: slot.vaccineName,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          patientName: data.patientName,
          idCard: data.idCard,
          phone: data.phone,
          status: 'booked',
          createdAt: dayjs().toISOString(),
        };

        const newBookedCount = slot.bookedCount + 1;
        set((state) => ({
          appointments: [...state.appointments, appointment],
          slots: state.slots.map((s) =>
            s.id === slot.id
              ? {
                  ...s,
                  bookedCount: newBookedCount,
                  status: newBookedCount >= s.totalCapacity ? 'full' as const : 'available' as const,
                }
              : s
          ),
        }));

        return appointment;
      },

      cancelAppointment: (id) => {
        const appointment = get().appointments.find((a) => a.id === id);
        if (!appointment) return;

        const slot = get().slots.find((s) => s.id === appointment.slotId);
        const newBookedCount = slot ? Math.max(0, slot.bookedCount - 1) : 0;

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status: 'cancelled' as const } : a
          ),
          slots: state.slots.map((s) =>
            s.id === appointment.slotId
              ? {
                  ...s,
                  bookedCount: newBookedCount,
                  status: newBookedCount >= s.totalCapacity ? 'full' as const : 'available' as const,
                }
              : s
          ),
        }));

        get().processWaitlistForSlot(appointment.slotId);
      },

      checkInAppointment: (id) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id
              ? { ...a, status: 'checked_in' as const, checkInTime: dayjs().toISOString() }
              : a
          ),
        }));
      },

      vaccinateAppointment: (id, batchId) => {
        const appointment = get().appointments.find((a) => a.id === id);
        const batch = get().batches.find((b) => b.id === batchId);
        if (!appointment || !batch) return;

        const vaccinationTime = dayjs().toISOString();

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'vaccinated' as const,
                  vaccinationTime,
                  batchId,
                  batchNo: batch.batchNo,
                }
              : a
          ),
          batches: state.batches.map((b) =>
            b.id === batchId ? { ...b, usedQuantity: b.usedQuantity + 1 } : b
          ),
        }));
      },

      startObservation: (id) => {
        const appointment = get().appointments.find((a) => a.id === id);
        if (!appointment) return;

        const startTime = dayjs();
        const endTime = startTime.add(30, 'minute');

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'observed' as const,
                  observationStartTime: startTime.toISOString(),
                  observationEndTime: endTime.toISOString(),
                }
              : a
          ),
          observationTimers: [
            ...state.observationTimers.filter((t) => t.appointmentId !== id),
            { appointmentId: id, endTime: endTime.toISOString() },
          ],
        }));
      },

      completeObservation: (id) => {
        get().completeObservationWithResult(id, 'normal');
      },

      completeObservationWithResult: (id, result, note) => {
        const appointment = get().appointments.find((a) => a.id === id);
        if (!appointment) return;

        const record: VaccinationRecord = {
          id: uuidv4(),
          appointmentId: appointment.id,
          patientName: appointment.patientName,
          idCard: appointment.idCard,
          phone: appointment.phone,
          vaccineId: appointment.vaccineId,
          vaccineName: appointment.vaccineName,
          batchId: appointment.batchId!,
          batchNo: appointment.batchNo!,
          stationId: appointment.stationId,
          stationName: appointment.stationName,
          vaccinationTime: appointment.vaccinationTime!,
          observationStartTime: appointment.observationStartTime!,
          observationEndTime: dayjs().toISOString(),
          observationResult: result,
          observationNote: note,
          status: result === 'normal' ? 'normal' : 'adverse_reaction',
          adverseReaction: result !== 'normal' ? note : undefined,
        };

        const recordStatusText: Record<string, string> = {
          normal: '正常',
          abnormal: '异常',
          urgent: '紧急',
        };

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status: 'completed' as const } : a
          ),
          records: [...state.records, record],
          observationTimers: state.observationTimers.filter((t) => t.appointmentId !== id),
        }));

        if (result !== 'normal') {
          get().addNotification({
            type: 'observation',
            title: '留观异常提醒',
            content: `${appointment.patientName}（${appointment.phone}）留观结果：${recordStatusText[result]}${note ? ' - ' + note : ''}`,
          });
        }
      },

      noShowAppointment: (id) => {
        const appointment = get().appointments.find((a) => a.id === id);
        if (!appointment) return;

        const slot = get().slots.find((s) => s.id === appointment.slotId);
        const newBookedCount = slot ? Math.max(0, slot.bookedCount - 1) : 0;

        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === id ? { ...a, status: 'no_show' as const } : a
          ),
          slots: state.slots.map((s) =>
            s.id === appointment.slotId
              ? {
                  ...s,
                  bookedCount: newBookedCount,
                  status: newBookedCount >= s.totalCapacity ? 'full' as const : 'available' as const,
                }
              : s
          ),
        }));

        get().processWaitlistForSlot(appointment.slotId);
      },

      addWaitlist: (data) => {
        const station = get().stations.find((s) => s.id === data.stationId);
        const vaccine = get().vaccines.find((v) => v.id === data.vaccineId);
        if (!station || !vaccine) return;

        const slot = data.slotId ? get().slots.find((s) => s.id === data.slotId) : null;

        const matchConditions = (w: WaitlistItem) => {
          if (data.slotId) {
            return w.slotId === data.slotId && w.status === 'waiting';
          }
          return (
            w.stationId === data.stationId &&
            w.vaccineId === data.vaccineId &&
            w.date === data.date &&
            w.slotId === null &&
            w.status === 'waiting'
          );
        };

        const maxPriority = get()
          .waitlist.filter(matchConditions)
          .reduce((max, w) => Math.max(max, w.priority), 0);

        const item: WaitlistItem = {
          id: uuidv4(),
          stationId: data.stationId,
          stationName: station.name,
          vaccineId: data.vaccineId,
          vaccineName: vaccine.name,
          date: data.date,
          slotId: data.slotId ?? null,
          slotStartTime: slot?.startTime,
          slotEndTime: slot?.endTime,
          patientName: data.patientName,
          idCard: data.idCard,
          phone: data.phone,
          priority: maxPriority + 1,
          status: 'waiting',
          createdAt: dayjs().toISOString(),
        };

        set((state) => ({
          waitlist: [...state.waitlist, item],
        }));
      },

      cancelWaitlist: (id) => {
        set((state) => ({
          waitlist: state.waitlist.map((w) =>
            w.id === id ? { ...w, status: 'cancelled' as const } : w
          ),
        }));
      },

      getWaitlistCountForSlot: (slotId) => {
        const slot = get().slots.find((s) => s.id === slotId);
        if (!slot) return { waiting: 0, notified: 0 };

        const waiting = get().waitlist.filter(
          (w) =>
            w.status === 'waiting' &&
            (w.slotId === slotId ||
              (w.slotId === null &&
                w.stationId === slot.stationId &&
                w.vaccineId === slot.vaccineId &&
                w.date === slot.date))
        ).length;

        const notified = get().waitlist.filter(
          (w) => w.slotId === slotId && w.status === 'notified'
        ).length;

        return { waiting, notified };
      },

      getAvailableCountForSlot: (slotId) => {
        const slot = get().slots.find((s) => s.id === slotId);
        if (!slot) return 0;
        const { notified } = get().getWaitlistCountForSlot(slotId);
        return Math.max(0, slot.totalCapacity - slot.bookedCount - notified);
      },

      processWaitlistForSlot: (slotId) => {
        const slot = get().slots.find((s) => s.id === slotId);
        if (!slot) return null;

        const availableCount = get().getAvailableCountForSlot(slotId);
        if (availableCount <= 0) return null;

        const hasNotifiedForSlot = get().waitlist.some(
          (w) => w.slotId === slotId && w.status === 'notified'
        );
        if (hasNotifiedForSlot) return null;

        const exactMatch = get()
          .waitlist.filter(
            (w) => w.slotId === slotId && w.status === 'waiting'
          )
          .sort((a, b) => a.priority - b.priority);

        const generalMatch = get()
          .waitlist.filter(
            (w) =>
              w.slotId === null &&
              w.stationId === slot.stationId &&
              w.vaccineId === slot.vaccineId &&
              w.date === slot.date &&
              w.status === 'waiting'
          )
          .sort((a, b) => a.priority - b.priority);

        const waitingList = [...exactMatch, ...generalMatch];

        if (waitingList.length === 0) return null;

        const nextPerson = waitingList[0];

        const notifiedItem: WaitlistItem = {
          ...nextPerson,
          status: 'notified',
          slotId: slot.id,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          notifiedAt: dayjs().toISOString(),
          expiresAt: dayjs().add(15, 'minute').toISOString(),
        };

        set((state) => ({
          waitlist: state.waitlist.map((w) => (w.id === nextPerson.id ? notifiedItem : w)),
        }));

        get().addNotification({
          type: 'waitlist',
          title: '候补补位通知',
          content: `${nextPerson.patientName}（${nextPerson.phone}）${slot.date} ${slot.startTime}-${slot.endTime} 有号源，请在15分钟内确认`,
        });

        return notifiedItem;
      },

      confirmWaitlist: (id) => {
        const item = get().waitlist.find((w) => w.id === id);
        if (!item || item.status !== 'notified' || !item.slotId) return null;

        const slot = get().slots.find((s) => s.id === item.slotId);
        if (!slot || slot.bookedCount >= slot.totalCapacity) return null;

        const appointment: Appointment = {
          id: uuidv4(),
          slotId: slot.id,
          stationId: slot.stationId,
          stationName: slot.stationName,
          vaccineId: slot.vaccineId,
          vaccineName: slot.vaccineName,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          patientName: item.patientName,
          idCard: item.idCard,
          phone: item.phone,
          status: 'booked',
          createdAt: dayjs().toISOString(),
        };

        const newBookedCount = slot.bookedCount + 1;

        set((state) => ({
          waitlist: state.waitlist.map((w) =>
            w.id === id ? { ...w, status: 'confirmed' as const } : w
          ),
          appointments: [...state.appointments, appointment],
          slots: state.slots.map((s) =>
            s.id === slot.id
              ? {
                  ...s,
                  bookedCount: newBookedCount,
                  status: newBookedCount >= s.totalCapacity ? 'full' as const : 'available' as const,
                }
              : s
          ),
        }));

        return appointment;
      },

      declineWaitlist: (id) => {
        const item = get().waitlist.find((w) => w.id === id);
        if (!item || item.status !== 'notified' || !item.slotId) return;

        const slotId = item.slotId;

        set((state) => ({
          waitlist: state.waitlist.map((w) =>
            w.id === id ? { ...w, status: 'cancelled' as const } : w
          ),
        }));

        get().processWaitlistForSlot(slotId);
      },

      expireWaitlistNotifications: () => {
        const now = dayjs();
        const expiredItems = get().waitlist.filter(
          (w) => w.status === 'notified' && w.expiresAt && now.isAfter(dayjs(w.expiresAt))
        );

        if (expiredItems.length === 0) return;

        const affectedSlotIds = new Set<string>();
        expiredItems.forEach((item) => {
          if (item.slotId) {
            affectedSlotIds.add(item.slotId);
          }
        });

        set((state) => ({
          waitlist: state.waitlist.map((w) => {
            if (w.status === 'notified' && w.expiresAt && now.isAfter(dayjs(w.expiresAt))) {
              return { ...w, status: 'expired' as const };
            }
            return w;
          }),
        }));

        affectedSlotIds.forEach((slotId) => {
          get().processWaitlistForSlot(slotId);
        });
      },

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            { ...notification, id: uuidv4(), read: false, createdAt: dayjs().toISOString() },
            ...state.notifications,
          ],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      addObservationTimer: (appointmentId, durationMinutes) => {
        const endTime = dayjs().add(durationMinutes, 'minute').toISOString();
        set((state) => ({
          observationTimers: [
            ...state.observationTimers.filter((t) => t.appointmentId !== appointmentId),
            { appointmentId, endTime },
          ],
        }));
      },

      removeObservationTimer: (appointmentId) =>
        set((state) => ({
          observationTimers: state.observationTimers.filter((t) => t.appointmentId !== appointmentId),
        })),

      getRecordsByBatch: (batchId) => {
        return get().records.filter((r) => r.batchId === batchId);
      },

      searchRecords: (keyword) => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return [];
        return get().records.filter(
          (r) =>
            r.patientName.toLowerCase().includes(kw) ||
            r.phone.includes(kw) ||
            r.idCard.toLowerCase().includes(kw)
        );
      },

      createRecall: (batchId, reason) => {
        get().recallBatch(batchId, reason);
      },

      checkInventoryAlerts: () => {
        const today = dayjs().startOf('day');
        const expiringThresholdDays = 30;
        const lowStockThreshold = 5;

        const expiringBatches = get().batches.filter(
          (b) =>
            b.status === 'normal' &&
            !dayjs(b.expiryDate).isBefore(today) &&
            dayjs(b.expiryDate).diff(today, 'day') <= expiringThresholdDays &&
            b.quantity - b.usedQuantity > 0
        );

        const vaccineStockMap: Record<string, { vaccineId: string; vaccineName: string; remaining: number }> = {};
        get().batches
          .filter(
            (b) =>
              b.status === 'normal' &&
              !dayjs(b.expiryDate).isBefore(today)
          )
          .forEach((b) => {
            if (!vaccineStockMap[b.vaccineId]) {
              vaccineStockMap[b.vaccineId] = {
                vaccineId: b.vaccineId,
                vaccineName: b.vaccineName,
                remaining: 0,
              };
            }
            vaccineStockMap[b.vaccineId].remaining += b.quantity - b.usedQuantity;
          });

        const lowStockVaccines = Object.values(vaccineStockMap)
          .filter((v) => v.remaining <= lowStockThreshold)
          .map((v) => ({
            ...v,
            threshold: lowStockThreshold,
            suggestOrder: Math.max(5, 10 - v.remaining),
          }));

        return { expiringBatches, lowStockVaccines };
      },
    }),
    {
      name: 'vaccine-booking-storage',
    }
  )
);
