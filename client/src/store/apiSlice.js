import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout, setCredentials, updateUser } from './authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, ''),
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token || localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }
});

// Custom base query with automatic handling of 401 unauthenticated or 428 password change required
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    api.dispatch(logout());
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Admin', 'User', 'Point', 'Transaction', 'Report', 'Audit', 'Notification', 'Casino', 'Lotto'],
  endpoints: (builder) => ({
    // Auth Endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials({ user: data.user, token: data.token }));
        } catch (err) {}
      },
      invalidatesTags: ['Auth', 'Report', 'Point', 'Notification']
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const liveBalance = data?.pointAccount?.balance ?? data?.balance;
          if (liveBalance !== undefined) {
            dispatch(updateUser({ balance: liveBalance }));
          }
        } catch (err) {}
      },
      providesTags: ['Auth', 'Point']
    }),
    changePassword: builder.mutation({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwords
      }),
      invalidatesTags: ['Auth']
    }),

    // Admin Management Endpoints
    getAdmins: builder.query({
      query: () => '/admins',
      providesTags: ['Admin']
    }),
    getAdmin: builder.query({
      query: (id) => `/admins/${id}`,
      providesTags: (result, error, id) => [{ type: 'Admin', id }]
    }),
    createAdmin: builder.mutation({
      query: (data) => ({
        url: '/admins',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Admin', 'Report', 'Audit']
    }),
    updateAdmin: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/admins/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Admin', id }, 'Admin', 'Report', 'Audit']
    }),
    toggleAdminStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/admins/${id}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: ['Admin', 'User', 'Report', 'Audit']
    }),
    resetAdminPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `/admins/${id}/reset-password`,
        method: 'POST',
        body: { newPassword }
      }),
      invalidatesTags: ['Admin', 'Audit']
    }),
    mintPoints: builder.mutation({
      query: (data) => ({
        url: '/admins/mint',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Point', 'Auth', 'Report', 'Transaction', 'Audit']
    }),

    // User Management Endpoints
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User']
    }),
    getUser: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }]
    }),
    createUser: builder.mutation({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['User', 'Admin', 'Report', 'Audit']
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }, 'User', 'Audit']
    }),
    toggleUserStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: ['User', 'Admin', 'Report', 'Audit']
    }),
    resetUserPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `/users/${id}/reset-password`,
        method: 'POST',
        body: { newPassword }
      }),
      invalidatesTags: ['User', 'Audit']
    }),
    transferUser: builder.mutation({
      query: ({ userId, newAdminId, reason }) => ({
        url: `/users/${userId}/transfer`,
        method: 'POST',
        body: { newAdminId, reason }
      }),
      invalidatesTags: ['User', 'Admin', 'Report', 'Audit']
    }),

    // Point Allocation & Distribution Endpoints
    allocatePointsToAdmin: builder.mutation({
      query: (data) => ({
        url: '/points/allocate-admin',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Point', 'Auth', 'Admin', 'Transaction', 'Report', 'Audit']
    }),
    distributePointsToUser: builder.mutation({
      query: (data) => ({
        url: '/points/distribute-user',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Point', 'Auth', 'User', 'Admin', 'Transaction', 'Report', 'Audit']
    }),
    requestPoints: builder.mutation({
      query: (data) => ({
        url: '/points/request',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Point', 'Report', 'Audit']
    }),
    getPointRequests: builder.query({
      query: () => '/points/requests',
      providesTags: ['Point']
    }),
    reviewPointRequest: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/points/requests/${id}/review`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Point', 'Auth', 'Admin', 'Transaction', 'Report', 'Audit']
    }),
    reverseTransaction: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/points/transactions/${id}/reverse`,
        method: 'POST',
        body: { reason }
      }),
      invalidatesTags: ['Point', 'Auth', 'Admin', 'User', 'Transaction', 'Report', 'Audit']
    }),

    // Transactions Ledger Endpoints
    getTransactions: builder.query({
      query: (params) => ({
        url: '/transactions',
        params
      }),
      providesTags: ['Transaction']
    }),
    getTransactionDetails: builder.query({
      query: (id) => `/transactions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Transaction', id }]
    }),

    // Dashboard & Reports
    getDashboardReports: builder.query({
      query: () => '/reports/dashboard',
      providesTags: ['Report']
    }),

    // Audit Logs (Super Admin)
    getAuditLogs: builder.query({
      query: (params) => ({
        url: '/audit-logs',
        params
      }),
      providesTags: ['Audit']
    }),

    // Notifications
    getNotifications: builder.query({
      query: () => '/notifications',
      providesTags: ['Notification']
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification']
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification']
    }),

    // Casino Games Endpoints
    getCasinoStats: builder.query({
      query: () => '/casino/stats',
      providesTags: ['Casino']
    }),
    placeCasinoBet: builder.mutation({
      query: (data) => ({
        url: '/casino/bet',
        method: 'POST',
        body: data
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data && data.newBalance !== undefined) {
            dispatch(updateUser({ balance: data.newBalance }));
          }
        } catch (err) {}
      },
      invalidatesTags: ['Casino', 'Auth', 'Point', 'Report']
    }),
    requestUserPoints: builder.mutation({
      query: (data) => ({
        url: '/casino/request-points',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Notification']
    }),

    // Lotto 99 Endpoints
    getLottoRound: builder.query({
      query: () => '/lotto/current-round',
      providesTags: ['Lotto']
    }),
    placeLottoBet: builder.mutation({
      query: (data) => ({
        url: '/lotto/bet',
        method: 'POST',
        body: data
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data && data.newBalance !== undefined) {
            dispatch(updateUser({ balance: data.newBalance }));
          }
        } catch (err) {}
      },
      invalidatesTags: ['Lotto', 'Auth', 'Point', 'Casino', 'Report']
    }),
    getLottoHistory: builder.query({
      query: (params) => ({
        url: '/lotto/history',
        params
      }),
      providesTags: ['Lotto']
    }),
    getMyLottoBets: builder.query({
      query: () => '/lotto/my-bets',
      providesTags: ['Lotto']
    }),
    refillLottoDemo: builder.mutation({
      query: () => ({
        url: '/lotto/refill-demo',
        method: 'POST'
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data && data.newBalance !== undefined) {
            dispatch(updateUser({ balance: data.newBalance }));
          }
        } catch (err) {}
      },
      invalidatesTags: ['Lotto', 'Auth', 'Point', 'Casino']
    })
  })
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useChangePasswordMutation,
  useGetAdminsQuery,
  useGetAdminQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useToggleAdminStatusMutation,
  useResetAdminPasswordMutation,
  useMintPointsMutation,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
  useTransferUserMutation,
  useAllocatePointsToAdminMutation,
  useDistributePointsToUserMutation,
  useRequestPointsMutation,
  useGetPointRequestsQuery,
  useReviewPointRequestMutation,
  useReverseTransactionMutation,
  useGetTransactionsQuery,
  useGetTransactionDetailsQuery,
  useGetDashboardReportsQuery,
  useGetAuditLogsQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetCasinoStatsQuery,
  usePlaceCasinoBetMutation,
  useRequestUserPointsMutation,
  useGetLottoRoundQuery,
  usePlaceLottoBetMutation,
  useGetLottoHistoryQuery,
  useGetMyLottoBetsQuery,
  useRefillLottoDemoMutation
} = apiSlice;
