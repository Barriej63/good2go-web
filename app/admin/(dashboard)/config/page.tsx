import { getAdminRole } from '@/lib/adminAuth';
import ConfigEditor from './ui/ConfigEditor';

export default async function ConfigPage() {
  const role = await getAdminRole();
  const canEdit = role === 'superadmin';
  return <ConfigEditor canEdit={canEdit} />;
}
