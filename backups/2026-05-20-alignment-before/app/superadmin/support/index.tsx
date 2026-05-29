import React from 'react';
import { SupportListScreen } from '@/screens/support/SupportListScreen';

export default function SuperAdminSupportList() {
  return <SupportListScreen basePath="/superadmin/support" title="Support Tickets" isAdmin />;
}
