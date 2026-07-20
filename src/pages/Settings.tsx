import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Subject } from '../services/db';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Trash2, Plus, X, Book, Building2, Tags, ListChecks, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';

const ListItem = ({ 
  item, 
  onDelete, 
  onEdit, 
  onClickItem,
  validateDelete,
  renderExtras
}: { 
  item: any; 
  onDelete: (id: number) => void;
  onEdit?: (id: number, newName: string) => void;
  onClickItem?: (item: any) => void;
  validateDelete?: (id: number) => Promise<boolean>;
  renderExtras?: (item: any) => React.ReactNode;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const [showTrash, setShowTrash] = useState(false);
  const hoverTimeout = React.useRef<any>(null);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setShowTrash(true), 4000);
  };
  
  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    setShowTrash(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) setIsEditing(true);
  };

  const handleEditSubmit = () => {
    if (editValue.trim() && editValue !== item.name && onEdit) {
      onEdit(item.id, editValue.trim());
    } else {
      setEditValue(item.name);
    }
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (validateDelete) {
      const canDelete = await validateDelete(item.id);
      if (!canDelete) return;
    }
    onDelete(item.id);
  };

  return (
    <motion.li 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex items-center justify-between p-3.5 bg-surface-900/40 border border-white/10 backdrop-blur-sm shadow-sm rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-white/20",
        onClickItem ? "cursor-pointer" : ""
      )}
      onClick={() => !isEditing && onClickItem?.(item)}
    >
      <div className="flex-1 flex items-center gap-3">
        {item.color && (
          <span className="w-3.5 h-3.5 rounded-full shadow-[0_0_10px_currentColor] border border-white/20" style={{ backgroundColor: item.color, color: item.color }} />
        )}
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSubmit();
              if (e.key === 'Escape') {
                setEditValue(item.name);
                setIsEditing(false);
              }
            }}
            onClick={e => e.stopPropagation()}
            className="bg-transparent border-b border-primary-500 outline-none text-white w-full text-sm font-semibold"
          />
        ) : (
          <span 
            onDoubleClick={handleDoubleClick}
            className="text-sm font-semibold text-surface-200 hover:text-white transition-colors select-none flex-1"
          >
            {item.name}
          </span>
        )}
      </div>
      
      {renderExtras && renderExtras(item)}

      {showTrash && !isEditing && (
        <button 
          onClick={handleDelete}
          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.li>
  );
};

const SettingsSection = ({ 
  title, items, onAdd, onDelete, onEdit, validateDelete, placeholder, onClickItem, renderExtras, icon: Icon
}: { 
  title: string; 
  items: any[]; 
  onAdd: (name: string) => void; 
  onDelete: (id: number) => void;
  onEdit?: (id: number, newName: string) => void;
  validateDelete?: (id: number) => Promise<boolean>;
  placeholder: string;
  onClickItem?: (item: any) => void;
  renderExtras?: (item: any) => React.ReactNode;
  icon: any;
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (('key' in e && e.key === 'Enter') || e.type === 'click') {
      if (inputValue.trim()) {
        onAdd(inputValue.trim());
        setInputValue('');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 glass-card rounded-3xl space-y-5 flex flex-col h-full border-t border-white/10 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
      </div>
      
      <div className="flex gap-2 relative z-10">
        <Input 
          value={inputValue} 
          onChange={e => setInputValue(e.target.value)} 
          onKeyDown={handleAdd}
          placeholder={placeholder}
          className="bg-surface-900/50 backdrop-blur-md border-white/5"
        />
        <Button onClick={handleAdd} variant="primary" className="px-5">Add</Button>
      </div>

      <ul className="space-y-2 mt-2 flex-1 max-h-[16rem] overflow-y-auto pr-2 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10">
        <AnimatePresence>
          {items?.map(item => (
            <ListItem 
              key={item.id} 
              item={item} 
              onDelete={onDelete} 
              onEdit={onEdit}
              onClickItem={onClickItem}
              validateDelete={validateDelete}
              renderExtras={renderExtras}
            />
          ))}
        </AnimatePresence>
        {items?.length === 0 && (
          <p className="text-sm text-surface-500 py-4 text-center italic">No items found.</p>
        )}
      </ul>
    </div>
  );
};



const StatusSettingsSection = ({ 
  items, onEdit, validateDelete 
}: { 
  items: any[]; 
  onEdit: (id: number, newName: string) => void;
  validateDelete: (id: number) => Promise<boolean>;
}) => {
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (name.trim()) {
      await db.statuses.add({ name: name.trim(), color: '#94a3b8', isOutcome: false });
      setName('');
    }
  };

  return (
    <div className="p-4 sm:p-6 glass-card rounded-3xl space-y-5 flex flex-col h-full border-t border-white/10 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
          <ListChecks className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Statuses</h2>
      </div>
      
      <div className="flex gap-2 relative z-10">
        <Input 
          value={name} 
          onChange={e => setName(e.target.value)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Status name..."
          className="bg-surface-900/50 backdrop-blur-md border-white/5"
        />
        <Button size="sm" variant="primary" className="px-5 h-11" onClick={handleAdd}>Add</Button>
      </div>

      <ul className="space-y-2 mt-2 flex-1 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10">
        <AnimatePresence>
          {items?.map(item => (
            <ListItem 
              key={item.id} 
              item={item} 
              onDelete={async (id) => await db.statuses.delete(id)} 
              onEdit={onEdit}
              validateDelete={validateDelete}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
};

export const Settings: React.FC = () => {
  const coachings = useLiveQuery(() => db.coachings.toArray()) || [];
  const testTypes = useLiveQuery(() => db.testTypes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const tags = useLiveQuery(() => db.tags.toArray()) || [];
  const statuses = useLiveQuery(() => db.statuses.toArray()) || [];

  // Subject Modal State
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const subjectTopics = useLiveQuery(
    () => selectedSubject ? db.topics.where('subjectId').equals(selectedSubject.id!).toArray() : [],
    [selectedSubject]
  ) || [];
  const [newTopic, setNewTopic] = useState('');

  // Validation Functions
  const validateDeleteCoaching = async (id: number) => {
    const count = await db.tests.where('coachingId').equals(id).count();
    if (count > 0) {
      alert(`This coaching is currently associated with ${count} test(s). You must delete those tests before deleting this coaching.`);
      return false;
    }
    return true;
  };

  const validateDeleteTestType = async (id: number) => {
    const count = await db.tests.where('testTypeId').equals(id).count();
    if (count > 0) {
      alert(`This test type is currently associated with ${count} test(s). You must delete those tests before deleting this test type.`);
      return false;
    }
    return true;
  };

  const validateDeleteSubject = async (id: number) => {
    const count = await db.tests.where('subjectId').equals(id).count();
    if (count > 0) {
      alert(`This subject is currently associated with ${count} test(s). You must delete those tests before deleting this subject.`);
      return false;
    }
    return true;
  };

  const validateDeleteTag = async (id: number) => {
    const allQuestions = await db.questions.toArray();
    const count = allQuestions.filter(q => q.tagIds?.includes(id)).length;
    if (count > 0) {
      alert(`This tag is currently associated with ${count} question(s). You must remove it from those questions first.`);
      return false;
    }
    return true;
  };

  const validateDeleteTopic = async (id: number) => {
    const allQuestions = await db.questions.toArray();
    const count = allQuestions.filter(q => q.topicIds?.includes(id)).length;
    if (count > 0) {
      alert(`This topic is currently associated with ${count} question(s). You must remove it from those questions first.`);
      return false;
    }
    return true;
  };

  const validateDeleteStatus = async (id: number) => {
    const allQuestions = await db.questions.toArray();
    const count = allQuestions.filter(q => q.statusIds?.includes(id)).length;
    if (count > 0) {
      alert(`This status is currently associated with ${count} question(s). You must remove it from those questions first.`);
      return false;
    }
    return true;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="space-y-10 max-w-7xl mx-auto pb-16 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8"
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-purple-500/20 blur-2xl opacity-50 pointer-events-none rounded-full" />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-surface-200 to-surface-400 pb-2">
              Settings & Config
            </h1>
            <p className="text-lg text-surface-400 mt-3 font-light">
              Customize your subjects, tags, and testing platforms. Double-click any item to edit it, or hover for 4s to delete it.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          <SettingsSection 
            title="Subjects" 
            icon={Book}
            items={subjects} 
            placeholder="e.g. Operating Systems..."
            onAdd={async (name) => {
              if (!subjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
                await db.subjects.add({ name });
              }
            }}
            onEdit={async (id, name) => await db.subjects.update(id, { name })}
            onDelete={async (id) => await db.subjects.delete(id)}
            validateDelete={validateDeleteSubject}
            onClickItem={(s) => setSelectedSubject(s)}
          />

          <SettingsSection 
            title="Coachings" 
            icon={Building2}
            items={coachings} 
            placeholder="e.g. Made Easy..."
            onAdd={async (name) => {
              if (!coachings.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                await db.coachings.add({ name });
              }
            }}
            onEdit={async (id, name) => await db.coachings.update(id, { name })}
            onDelete={async (id) => await db.coachings.delete(id)}
            validateDelete={validateDeleteCoaching}
          />

          <SettingsSection 
            title="Test Types" 
            icon={CheckCircle2}
            items={testTypes} 
            placeholder="e.g. Subject Test..."
            onAdd={async (name) => {
              if (!testTypes.find(t => t.name.toLowerCase() === name.toLowerCase())) {
                await db.testTypes.add({ name });
              }
            }}
            onEdit={async (id, name) => await db.testTypes.update(id, { name })}
            onDelete={async (id) => await db.testTypes.delete(id)}
            validateDelete={validateDeleteTestType}
          />

          <SettingsSection 
            title="Global Tags" 
            icon={Tags}
            items={tags} 
            placeholder="e.g. Hard, Revision..."
            onAdd={async (name) => {
              if (!tags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
                await db.tags.add({ name });
              }
            }}
            onEdit={async (id, name) => await db.tags.update(id, { name })}
            onDelete={async (id) => await db.tags.delete(id)}
            validateDelete={validateDeleteTag}
            renderExtras={(item: any) => (
              <input 
                type="color" 
                value={item.color || '#a855f7'} // default to the old purple
                onChange={async (e) => await db.tags.update(item.id, { color: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent shrink-0"
                title="Tag Color"
              />
            )}
          />

          <StatusSettingsSection 
            items={statuses} 
            onEdit={async (id, name) => await db.statuses.update(id, { name })}
            validateDelete={validateDeleteStatus}
          />
        </div>

        {/* Full Width Matrix Section */}
        <div className="p-6 sm:p-8 glass-card rounded-3xl border-t border-white/10 mt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Dependencies Matrix</h2>
              <p className="text-surface-400 text-sm mt-1">Configure whether test types require a subject selection. (Checked = Dependent)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="pb-4 font-semibold text-surface-400 text-sm uppercase tracking-wider border-b border-white/10 w-1/3">Test Type</th>
                  <th className="pb-4 font-semibold text-surface-400 text-sm uppercase tracking-wider border-b border-white/10 text-center w-1/3">Fully Dependent</th>
                  <th className="pb-4 font-semibold text-surface-400 text-sm uppercase tracking-wider border-b border-white/10 text-center w-1/3">Partially Dependent</th>
                </tr>
              </thead>
              <tbody>
                {testTypes.map(testType => (
                  <tr key={testType.id} className="border-b border-white/5 hover:bg-surface-800/30 transition-colors">
                    <td className="py-5 font-medium text-surface-200">{testType.name}</td>
                    <td className="py-5 text-center">
                      <input 
                        type="checkbox" 
                        checked={testType.isFullyDependent || false}
                        onChange={async (e) => await db.testTypes.update(testType.id!, { isFullyDependent: e.target.checked, isPartiallyDependent: false })}
                        className="w-5 h-5 rounded border-white/20 bg-surface-900 text-primary-500 focus:ring-primary-500/50 cursor-pointer transition-transform hover:scale-110"
                      />
                    </td>
                    <td className="py-5 text-center">
                      <input 
                        type="checkbox" 
                        checked={testType.isPartiallyDependent || false}
                        onChange={async (e) => await db.testTypes.update(testType.id!, { isPartiallyDependent: e.target.checked, isFullyDependent: false })}
                        className="w-5 h-5 rounded border-white/20 bg-surface-900 text-primary-500 focus:ring-primary-500/50 cursor-pointer transition-transform hover:scale-110"
                      />
                    </td>
                  </tr>
                ))}
                {testTypes.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-surface-500 italic">No test types added yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Topics Modal for Selected Subject */}
      <AnimatePresence>
        {selectedSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/60">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="bg-surface-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 sm:p-6 md:p-8 border-b border-white/10 flex items-center justify-between bg-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500" />
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedSubject.name}</h2>
                  <p className="text-sm text-surface-400 mt-1">Manage topics for this subject</p>
                </div>
                <button 
                  onClick={() => setSelectedSubject(null)} 
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-surface-300 hover:text-white rounded-full transition-all duration-300 hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 sm:p-6 md:p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
                <div className="flex gap-3">
                  <Input 
                    value={newTopic} 
                    onChange={e => setNewTopic(e.target.value)} 
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newTopic.trim()) {
                        await db.topics.add({ subjectId: selectedSubject.id!, name: newTopic.trim() });
                        setNewTopic('');
                      }
                    }}
                    placeholder="Type a new topic and press enter..."
                    className="h-14 bg-surface-950/50 border-white/10 focus-visible:border-primary-500"
                    autoFocus
                  />
                  <Button 
                    variant="primary"
                    className="h-14 px-6 rounded-xl"
                    onClick={async () => {
                      if (newTopic.trim()) {
                        await db.topics.add({ subjectId: selectedSubject.id!, name: newTopic.trim() });
                        setNewTopic('');
                      }
                    }}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pr-2 -mr-2">
                  <ul className="space-y-3 pb-4">
                    <AnimatePresence>
                      {subjectTopics.map((topic) => (
                        <ListItem 
                          key={topic.id} 
                          item={topic} 
                          onDelete={async (id) => await db.topics.delete(id)} 
                          onEdit={async (id, name) => await db.topics.update(id, { name })}
                          validateDelete={validateDeleteTopic}
                        />
                      ))}
                    </AnimatePresence>
                    {subjectTopics.length === 0 && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="flex flex-col items-center justify-center py-12 text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                          <Book className="w-8 h-8 text-surface-500" />
                        </div>
                        <p className="text-surface-400 font-medium">No topics added yet.</p>
                        <p className="text-sm text-surface-500 mt-1">Start organizing your subject by adding topics above.</p>
                      </motion.div>
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
