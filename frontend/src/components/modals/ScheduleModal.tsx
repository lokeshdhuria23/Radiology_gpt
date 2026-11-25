import { useState } from 'react'
import { Calendar, Clock, X, CheckCircle2, AlertCircle, Plus, User } from 'lucide-react'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPatient?: (patientName: string) => void
}

export function ScheduleModal({ isOpen, onClose, onSelectPatient }: ScheduleModalProps) {
  const [selectedDay, setSelectedDay] = useState('Today')

  if (!isOpen) return null

  const scheduleItems = [
    {
      id: '1',
      time: '09:00 AM',
      patient: 'James Wilson (62M)',
      type: 'Inpatient Rounding',
      specialty: 'Radiology / Critical Care',
      status: 'In Progress',
      note: 'Abnormal CRP 64.2 mg/L, procalcitonin 1.8 ng/mL review',
    },
    {
      id: '2',
      time: '10:30 AM',
      patient: 'Maria Garcia (45F)',
      type: 'Outpatient Follow-up',
      specialty: 'Diagnostic Radiology',
      status: 'Upcoming',
      note: 'Post-chemo surveillance chest CT',
    },
    {
      id: '3',
      time: '01:15 PM',
      patient: 'Robert Taylor (58M)',
      type: 'Clinical Consultation',
      specialty: 'Cardiology',
      status: 'Upcoming',
      note: 'Troponin kinetic monitoring & ECG correlation',
    },
    {
      id: '4',
      time: '03:30 PM',
      patient: 'Sarah Jenkins (39F)',
      type: 'Inpatient Consultation',
      specialty: 'Emergency Medicine',
      status: 'Upcoming',
      note: 'Acute abdominal ultrasound evaluation',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Clinical Schedule & Rounds</h2>
              <p className="text-xs text-gray-500">Upcoming encounters, inpatient rounds, and consults</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-2.5">
          {['Today (Nov 23)', 'Tomorrow (Nov 24)', 'Wed (Nov 25)'].map((day, i) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                (i === 0 && selectedDay.startsWith('Today')) || selectedDay === day
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        <div className="max-h-96 overflow-y-auto p-6 space-y-3">
          {scheduleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between rounded-xl border border-gray-100 p-4 hover:border-primary-200 hover:bg-primary-50/20 transition cursor-pointer group"
              onClick={() => {
                if (onSelectPatient) onSelectPatient(item.patient)
                onClose()
              }}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  {item.time}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition">
                      {item.patient}
                    </p>
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                      {item.specialty}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{item.note}</p>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  item.status === 'In Progress'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3.5">
          <p className="text-xs text-gray-500">4 encounters scheduled for today</p>
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
