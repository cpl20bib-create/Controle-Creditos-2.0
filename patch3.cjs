const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const target1 = `  const filteredMenuItems = menuItems.filter(item => (item.roles as readonly string[]).includes(currentUser.role));`;

const replacement1 = `  const filteredMenuItems = menuItems.filter(item => (item.roles as readonly string[]).includes(currentUser.role));

  const userNotifications = auditLogs.filter(log => log.action === 'NOTIFICATION' && (log.entityType === currentUser.role || log.entityType === 'ALL'));
  const unreadCount = userNotifications.filter(log => !log.description.includes(\`"readBy":["\${currentUser.id}"]\`)).length;

  const [showNotifications, setShowNotifications] = useState(false);

  const markAllAsRead = async () => {
    const unread = userNotifications.filter(log => !log.description.includes(\`"readBy":["\${currentUser.id}"]\`));
    for (const log of unread) {
      try {
        const parsed = JSON.parse(log.description);
        parsed.readBy = parsed.readBy || [];
        if (!parsed.readBy.includes(currentUser.id)) {
           parsed.readBy.push(currentUser.id);
           const updated = { ...log, description: JSON.stringify(parsed) };
           await api.upsert('audit_logs', updated);
        }
      } catch (e) {}
    }
    syncWithServer();
  };
`;

code = code.replace(target1, replacement1);

const target2 = `          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-right hidden xs:block">`;

const replacement2 = `          <div className="flex items-center gap-4 md:gap-6">
            
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors relative">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Notificações</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase">
                        Marcar como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {userNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-medium">
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      userNotifications.slice(0, 50).map(notif => {
                        let parsed: any = { title: 'Aviso', message: notif.description };
                        try { parsed = JSON.parse(notif.description); } catch(e){}
                        const isRead = parsed.readBy?.includes(currentUser.id);
                        return (
                          <div key={notif.id} className={\`p-4 border-b border-slate-50 transition-colors \${isRead ? 'opacity-50' : 'bg-slate-50/30'}\`}>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">{parsed.title}</h4>
                            <p className="text-[11px] text-slate-600 leading-snug">{parsed.message}</p>
                            <span className="text-[9px] text-slate-400 font-medium mt-2 block">
                              {new Date(notif.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-right hidden xs:block">`;

code = code.replace(target2, replacement2);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx for notifications');
