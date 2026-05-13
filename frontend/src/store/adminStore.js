import { create } from 'zustand';

export const useAdminStore = create((set) => ({
  // Dashboard Overview Data
  overviewData: null,
  setOverviewData: (data) => set({ overviewData: data }),
  overviewLastUpdated: null,
  setOverviewLastUpdated: (date) => set({ overviewLastUpdated: date }),

  // User Management
  users: [],
  setUsers: (users) => set({ users }),
  usersTotalPages: 1,
  setUsersTotalPages: (pages) => set({ usersTotalPages: pages }),
  usersPage: 1,
  setUsersPage: (page) => set({ usersPage: page }),
  usersSearch: '',
  setUsersSearch: (search) => set({ usersSearch: search }),
  usersRoleFilter: '',
  setUsersRoleFilter: (role) => set({ usersRoleFilter: role }),
  usersStatusFilter: '',
  setUsersStatusFilter: (status) => set({ usersStatusFilter: status }),

  // Shared stats
  stats: null,
  setStats: (stats) => set({ stats }),
}));
