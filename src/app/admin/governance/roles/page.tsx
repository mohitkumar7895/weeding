'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRolesGovernance() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/governance/roles');
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles);
        setPermissions(data.permissions);
        setMappings(data.mappings);
        setPendingChanges(new Map());
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const hasPermission = (roleId: string, permissionId: string) => {
    // Check pending changes first
    if (pendingChanges.has(roleId)) {
      return pendingChanges.get(roleId)?.includes(permissionId);
    }
    // Fallback to saved mappings
    return mappings.some(m => m.role_id === roleId && m.permission_id === permissionId);
  };

  const togglePermission = (roleId: string, permissionId: string, currentState: boolean) => {
    // Get the current active list for this role
    let activeList = pendingChanges.get(roleId);
    if (!activeList) {
      activeList = mappings.filter(m => m.role_id === roleId).map(m => m.permission_id);
    }

    const newList = currentState
      ? activeList.filter(id => id !== permissionId)
      : [...activeList, permissionId];

    const updatedChanges = new Map(pendingChanges);
    updatedChanges.set(roleId, newList);
    setPendingChanges(updatedChanges);
  };

  const handleSave = async (roleId: string) => {
    const permissionIds = pendingChanges.get(roleId);
    if (!permissionIds) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/governance/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds })
      });
      const data = await res.json();
      if (data.success) {
        alert('Permissions updated successfully!');
        fetchRoles(); // Refresh everything
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading RBAC Matrix...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, curr) => {
    if (!acc[curr.module]) acc[curr.module] = [];
    acc[curr.module].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold">Role Permissions (RBAC Matrix)</h1>
        <p className="text-sm text-gray-500 mt-1">Configure granular system access rights for each operational role.</p>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left w-1/4">Module & Permission</th>
                {roles.map(role => (
                  <th key={role.id} className="px-6 py-3 text-center">
                    <div className="font-bold text-gray-900">{role.name}</div>
                    <div className="mt-2">
                      {pendingChanges.has(role.id) && (
                        <button 
                          onClick={() => handleSave(role.id)} 
                          disabled={saving}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-[10px] hover:bg-indigo-700 disabled:opacity-50"
                        >
                          SAVE ROLE
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 text-sm">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <React.Fragment key={module}>
                  <tr className="bg-gray-50/50">
                    <td colSpan={roles.length + 1} className="px-6 py-2 font-bold text-gray-700 uppercase text-xs tracking-wider border-y">
                      {module}
                    </td>
                  </tr>
                  {perms.map(perm => (
                    <tr key={perm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{perm.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{perm.action}</div>
                      </td>
                      {roles.map(role => {
                        const isChecked = hasPermission(role.id, perm.id);
                        // SUPER_ADMIN usually shouldn't be edited via UI safely to prevent lockouts, but we allow it per prompt logic, maybe add a warning.
                        const isSuperAdmin = role.name === 'SUPER_ADMIN';
                        
                        return (
                          <td key={`${role.id}-${perm.id}`} className="px-6 py-3 text-center">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                              checked={isChecked}
                              onChange={() => togglePermission(role.id, perm.id, isChecked)}
                              disabled={isSuperAdmin && perm.name === 'manage_roles'} // Prevent lockout
                              title={isSuperAdmin ? "Super Admin defaults" : ""}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Quick hack for React Fragment without explicit import in this auto-generated file
import React from 'react';
