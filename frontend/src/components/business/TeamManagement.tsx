import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  UserPlus,
  CreditCard,
  Shield,
  DollarSign,
  Mail,
  Calendar,
  MoreVertical,
  Lock,
  TrendingUp,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import Card, { CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Dropdown from '../ui/Dropdown';
import Modal from '../ui/Modal';
import { TeamMember } from '@/app/business/page';

interface TeamManagementProps {
  teamMembers: TeamMember[];
  onAddMember: () => void;
  onUpdateMember: (member: TeamMember) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  teamMembers,
  onAddMember,
}) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const formatCurrency = (amount: number) => {
    return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getRoleBadge = (role: TeamMember['role']) => {
    const roleConfig = {
      owner: { color: 'bg-[var(--primary-violet)]', icon: Shield },
      admin: { color: 'bg-[var(--primary-blue)]', icon: Lock },
      manager: { color: 'bg-[var(--primary-indigo)]', icon: Users },
      employee: { color: 'bg-[var(--primary-emerald)]', icon: CreditCard },
    };

    const config = roleConfig[role];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
        <Icon className="w-3 h-3" />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </div>
    );
  };

  const getCardStatusBadge = (status: TeamMember['cardStatus']) => {
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex items-center gap-1 text-xs text-[var(--primary-emerald)]">
            <Check className="w-3 h-3" />
            Active
          </div>
        );
      case 'pending':
        return (
          <div className="inline-flex items-center gap-1 text-xs text-[var(--primary-amber)]">
            <AlertCircle className="w-3 h-3" />
            Pending
          </div>
        );
      case 'none':
        return (
          <div className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
            <X className="w-3 h-3" />
            No Card
          </div>
        );
    }
  };

  const departments = ['all', ...Array.from(new Set(teamMembers.map(m => m.department)))];
  const roles = ['all', 'owner', 'admin', 'manager', 'employee'];

  // Filter team members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || member.department === filterDepartment;

    return matchesSearch && matchesRole && matchesDepartment;
  });

  const menuOptions = [
    { value: 'edit', label: 'Edit Details', icon: <Users size={16} /> },
    { value: 'card', label: 'Manage Card', icon: <CreditCard size={16} /> },
    { value: 'limits', label: 'Set Limits', icon: <DollarSign size={16} /> },
    { value: 'remove', label: 'Remove Member', icon: <X size={16} /> },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header and Filters */}
        <Card variant="subtle">
          <CardBody>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Users size={18} />}
                />
              </div>
              
              <div className="flex gap-2">
                <Dropdown
                  items={roles.map(role => ({ 
                    value: role, 
                    label: role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)
                  }))}
                  value={filterRole}
                  onChange={setFilterRole}
                  placeholder="Role"
                />
                
                <Dropdown
                  items={departments.map(dept => ({ 
                    value: dept, 
                    label: dept === 'all' ? 'All Departments' : dept 
                  }))}
                  value={filterDepartment}
                  onChange={setFilterDepartment}
                  placeholder="Department"
                />
                
                <Button
                  variant="primary"
                  icon={<UserPlus size={18} />}
                  onClick={onAddMember}
                >
                  Add Member
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member, index) => {
            const spendingPercentage = (member.currentSpending / member.monthlyLimit) * 100;
            
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="default" className="h-full">
                  <div className="p-6">
                    {/* Member Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)] flex items-center justify-center text-white font-medium text-lg">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-medium text-[var(--text-1)]">{member.name}</h3>
                          <p className="text-sm text-[var(--text-2)]">{member.department}</p>
                        </div>
                      </div>
                      
                      <Dropdown
                        items={menuOptions}
                        onChange={(value) => {
                          setSelectedMember(member);
                          if (value === 'edit') {
                            setShowMemberDetails(true);
                          }
                        }}
                        trigger={
                          <Button variant="ghost" size="sm" className="!p-1">
                            <MoreVertical size={16} />
                          </Button>
                        }
                      />
                    </div>

                    {/* Role and Card Status */}
                    <div className="flex items-center justify-between mb-4">
                      {getRoleBadge(member.role)}
                      {getCardStatusBadge(member.cardStatus)}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {new Date(member.joinedDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Spending Info */}
                    {member.cardStatus === 'active' && (
                      <div className="space-y-3 pt-4 border-t border-[var(--border-1)]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--text-2)]">Monthly Spending</span>
                          <span className="text-sm font-medium text-[var(--text-1)]">
                            {formatCurrency(member.currentSpending)}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--text-2)]">
                              {spendingPercentage.toFixed(0)}% of limit
                            </span>
                            <span className="text-xs text-[var(--text-2)]">
                              {formatCurrency(member.monthlyLimit)}
                            </span>
                          </div>
                          <div className="h-2 bg-[rgba(var(--glass-rgb),0.1)] rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${
                                spendingPercentage > 80 
                                  ? 'bg-gradient-to-r from-[var(--primary-amber)] to-[var(--primary-amber)]/80'
                                  : 'bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-indigo)]'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, spendingPercentage)}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-[var(--border-1)]">
                      {member.cardStatus === 'none' ? (
                        <Button variant="primary" size="sm" fullWidth icon={<CreditCard size={16} />}>
                          Issue Card
                        </Button>
                      ) : member.cardStatus === 'pending' ? (
                        <Button variant="secondary" size="sm" fullWidth disabled>
                          Card Pending
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setSelectedMember(member);
                            setShowMemberDetails(true);
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Team Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="subtle" className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--primary-blue)]/10">
                <Users className="w-5 h-5 text-[var(--primary-blue)]" />
              </div>
              <h3 className="font-medium text-[var(--text-1)]">Total Team Members</h3>
            </div>
            <p className="text-2xl font-bold text-[var(--text-1)]">{teamMembers.length}</p>
          </Card>

          <Card variant="subtle" className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--primary-emerald)]/10">
                <CreditCard className="w-5 h-5 text-[var(--primary-emerald)]" />
              </div>
              <h3 className="font-medium text-[var(--text-1)]">Active Cards</h3>
            </div>
            <p className="text-2xl font-bold text-[var(--text-1)]">
              {teamMembers.filter(m => m.cardStatus === 'active').length}
            </p>
          </Card>

          <Card variant="subtle" className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-[var(--primary-indigo)]/10">
                <TrendingUp className="w-5 h-5 text-[var(--primary-indigo)]" />
              </div>
              <h3 className="font-medium text-[var(--text-1)]">Total Monthly Limit</h3>
            </div>
            <p className="text-2xl font-bold text-[var(--text-1)]">
              {formatCurrency(teamMembers.reduce((sum, m) => sum + m.monthlyLimit, 0))}
            </p>
          </Card>
        </div>
      </div>

      {/* Member Details Modal */}
      <Modal
        isOpen={showMemberDetails}
        onClose={() => {
          setShowMemberDetails(false);
          setSelectedMember(null);
        }}
        title={selectedMember ? `${selectedMember.name} - Details` : 'Member Details'}
        size="lg"
      >
        {selectedMember && (
          <div className="space-y-4">
            <p className="text-[var(--text-2)]">
              Detailed member management interface will be implemented here.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default TeamManagement;