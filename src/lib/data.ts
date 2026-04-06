import type { VkFolder, VkLink } from '@/types'

export const INITIAL_VK_FOLDERS: VkFolder[] = [
  { id: 'f1', name: 'Machine Learning' },
  { id: 'f2', name: 'React & Frontend' },
  { id: 'f3', name: 'Design & UX' },
]

export const INITIAL_VK_LINKS: VkLink[] = [
  { id: 'l1', fid: 'f1', url: 'https://youtube.com/watch?v=aircAruvnKk', title: 'Neural Networks from Scratch', thumb: 'https://img.youtube.com/vi/aircAruvnKk/mqdefault.jpg', type: 'yt', vid: 'aircAruvnKk' },
  { id: 'l2', fid: 'f1', url: 'https://youtube.com/watch?v=VMj-3S1tku0', title: 'The spelled-out intro to neural networks', thumb: 'https://img.youtube.com/vi/VMj-3S1tku0/mqdefault.jpg', type: 'yt', vid: 'VMj-3S1tku0' },
  { id: 'l3', fid: 'f2', url: 'https://youtube.com/watch?v=Ke90Tje7VS0', title: 'React in 100 Seconds', thumb: 'https://img.youtube.com/vi/Ke90Tje7VS0/mqdefault.jpg', type: 'yt', vid: 'Ke90Tje7VS0' },
  { id: 'l4', fid: 'f2', url: 'https://youtube.com/watch?v=hQAHSlTtcmY', title: 'React Hooks Tutorial for Beginners', thumb: 'https://img.youtube.com/vi/hQAHSlTtcmY/mqdefault.jpg', type: 'yt', vid: 'hQAHSlTtcmY' },
  { id: 'l5', fid: 'f3', url: 'https://youtube.com/watch?v=5IanQIwhA4E', title: 'UI Design for Developers', thumb: 'https://img.youtube.com/vi/5IanQIwhA4E/mqdefault.jpg', type: 'yt', vid: '5IanQIwhA4E' },
  { id: 'l6', fid: 'f3', url: 'https://youtube.com/watch?v=LkIChhuO3KI', title: 'Dark Mode Design Tips', thumb: 'https://img.youtube.com/vi/LkIChhuO3KI/mqdefault.jpg', type: 'yt', vid: 'LkIChhuO3KI' },
  { id: 'l7', fid: 'f1', url: 'https://youtube.com/watch?v=2ePf9rue1Ao', title: 'How GPT works – Transformers explained', thumb: 'https://img.youtube.com/vi/2ePf9rue1Ao/mqdefault.jpg', type: 'yt', vid: '2ePf9rue1Ao' },
]
