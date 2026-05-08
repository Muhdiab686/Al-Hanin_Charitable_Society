<x-layouts.app>
    <div class="flex h-full w-full flex-1 flex-col gap-6 rounded-xl" id="admin-dashboard">
        <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 class="text-xl font-semibold">Admin Dashboard</h1>
                    <p class="text-sm text-neutral-500 dark:text-neutral-400">
                        Operational snapshot and analytics for Hanin Charity.
                    </p>
                </div>
                <button
                    type="button"
                    id="print-dashboard-report"
                    class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                    Print Report
                </button>
            </div>
        </div>

        <div class="rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900">
            <div class="flex flex-wrap gap-2" id="dashboard-tabs">
                <button data-tab="overview" class="dashboard-tab-btn rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Overview</button>
                <button data-tab="roles" class="dashboard-tab-btn rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">Roles</button>
                <button data-tab="users" class="dashboard-tab-btn rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">Users</button>
                <button data-tab="reports" class="dashboard-tab-btn rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">Reports</button>
            </div>
        </div>

        <section data-tab-section="overview" class="dashboard-tab-section flex flex-col gap-6">
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="widgets">
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <p class="text-sm text-neutral-500">Sponsored Families</p>
                    <p class="mt-2 text-3xl font-bold" id="widget-sponsored">-</p>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <p class="text-sm text-neutral-500">Cash Donations (This Month)</p>
                    <p class="mt-2 text-3xl font-bold" id="widget-donations">-</p>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <p class="text-sm text-neutral-500">Active Volunteers (30 days)</p>
                    <p class="mt-2 text-3xl font-bold" id="widget-volunteers">-</p>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <p class="text-sm text-neutral-500">Treasury Balance</p>
                    <p class="mt-2 text-3xl font-bold" id="widget-treasury">-</p>
                </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <div class="mb-3 flex items-center justify-between">
                        <h2 class="font-semibold">Warehouse Consumption ({{ now()->year }})</h2>
                        <span class="text-xs text-neutral-500">Ramadan vs normal months</span>
                    </div>
                    <div class="space-y-2" id="consumption-bars"></div>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Aid Distribution Mix</h2>
                    <div class="space-y-3" id="distribution-bars"></div>
                </div>
            </div>
        </section>

        <section data-tab-section="roles" class="dashboard-tab-section hidden">
            <div class="grid gap-4 lg:grid-cols-2">
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Roles & Permissions</h2>
                    <div class="space-y-3" id="roles-list"></div>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Role Catalog Notes</h2>
                    <p class="text-sm text-neutral-500">
                        You can inspect every role below and then manage assignments from the Users tab.
                    </p>
                </div>
            </div>
        </section>

        <section data-tab-section="users" class="dashboard-tab-section hidden">
            <div class="grid gap-4 lg:grid-cols-2">
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Add New User</h2>
                    <form id="create-user-form" class="grid gap-3 md:grid-cols-2">
                        <input class="dashboard-form-control rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400" name="name" placeholder="Name" required />
                        <input class="dashboard-form-control rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400" name="email" placeholder="Email" type="email" required />
                        <input class="dashboard-form-control rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400" name="password" placeholder="Password (min 8)" type="password" required />
                        <input class="dashboard-form-control rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400" name="password_confirmation" placeholder="Confirm Password" type="password" required />
                        <select class="dashboard-form-control rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" name="role" id="create-user-role" required></select>
                        <button type="submit" class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">Create User</button>
                    </form>
                    <p id="create-user-feedback" class="mt-3 text-xs text-neutral-500"></p>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">User Management</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-left text-xs text-neutral-500">
                                <tr>
                                    <th class="pb-2">Name</th>
                                    <th class="pb-2">Email</th>
                                    <th class="pb-2">Role</th>
                                    <th class="pb-2">Action</th>
                                </tr>
                            </thead>
                            <tbody id="users-table" class="text-neutral-700 dark:text-neutral-200"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        <section data-tab-section="reports" class="dashboard-tab-section hidden">
            <div class="grid gap-4 lg:grid-cols-2">
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Donation Channels</h2>
                    <div class="space-y-3" id="channel-bars"></div>
                </div>
                <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <h2 class="mb-3 font-semibold">Recent Cash Donations</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="text-left text-xs text-neutral-500">
                                <tr>
                                    <th class="pb-2">Receipt</th>
                                    <th class="pb-2">Type</th>
                                    <th class="pb-2">Channel</th>
                                    <th class="pb-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody id="recent-donations-table" class="text-neutral-700 dark:text-neutral-200"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <h2 class="mb-3 font-semibold">Recent Aid Requests</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="text-left text-xs text-neutral-500">
                            <tr>
                                <th class="pb-2">Beneficiary</th>
                                <th class="pb-2">Type</th>
                                <th class="pb-2">Status</th>
                                <th class="pb-2">Created At</th>
                            </tr>
                        </thead>
                        <tbody id="recent-aid-requests-table" class="text-neutral-700 dark:text-neutral-200"></tbody>
                    </table>
                </div>
            </div>
        </section>
    </div>

    <script>
        (async function initAdminDashboard() {
            try {
                const csrfToken = '{{ csrf_token() }}';
                const tabs = Array.from(document.querySelectorAll('.dashboard-tab-btn'));
                const sections = Array.from(document.querySelectorAll('.dashboard-tab-section'));
                tabs.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tab = btn.getAttribute('data-tab');
                        tabs.forEach(item => {
                            item.classList.remove('bg-emerald-600', 'text-white');
                            item.classList.add('text-neutral-700', 'dark:text-neutral-200');
                        });
                        btn.classList.add('bg-emerald-600', 'text-white');
                        btn.classList.remove('text-neutral-700', 'dark:text-neutral-200');

                        sections.forEach(section => {
                            const matches = section.getAttribute('data-tab-section') === tab;
                            section.classList.toggle('hidden', !matches);
                            section.classList.toggle('flex', matches && tab === 'overview');
                        });
                    });
                });

                const response = await fetch('{{ route('dashboard.data') }}', {
                    headers: {
                        'Accept': 'application/json'
                    },
                    credentials: 'same-origin'
                });

                if (!response.ok) {
                    throw new Error('Failed to load dashboard analytics.');
                }

                const data = await response.json();

                document.getElementById('widget-sponsored').textContent = data.widgets.sponsored_families;
                document.getElementById('widget-donations').textContent = `${data.widgets.cash_donations_this_month} $`;
                document.getElementById('widget-volunteers').textContent = data.widgets.active_volunteers;
                document.getElementById('widget-treasury').textContent = `${data.widgets.treasury_balance} $`;

                const consumptionContainer = document.getElementById('consumption-bars');
                const monthly = data.analytics.warehouse_consumption_by_month || [];
                const maxConsumption = Math.max(...monthly.map(item => item.total_consumption), 1);

                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                monthly.forEach(item => {
                    const percent = Math.round((item.total_consumption / maxConsumption) * 100);
                    const row = document.createElement('div');
                    row.innerHTML = `
                        <div class="mb-1 flex items-center justify-between text-xs text-neutral-500">
                            <span>${monthNames[item.month - 1]}</span>
                            <span>${item.total_consumption}</span>
                        </div>
                        <div class="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700">
                            <div class="h-2 rounded bg-indigo-500" style="width: ${percent}%"></div>
                        </div>
                    `;
                    consumptionContainer.appendChild(row);
                });

                const distributionContainer = document.getElementById('distribution-bars');
                const distribution = data.analytics.aid_distribution_by_type || {};
                const totalDistribution = Object.values(distribution).reduce((sum, value) => sum + Number(value), 0) || 1;

                const labels = {
                    health: 'Health',
                    financial: 'Financial',
                    food: 'Food'
                };

                Object.keys(labels).forEach(key => {
                    const value = Number(distribution[key] || 0);
                    const percent = Math.round((value / totalDistribution) * 100);
                    const row = document.createElement('div');
                    row.innerHTML = `
                        <div class="mb-1 flex items-center justify-between text-xs text-neutral-500">
                            <span>${labels[key]}</span>
                            <span>${value} (${percent}%)</span>
                        </div>
                        <div class="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700">
                            <div class="h-2 rounded bg-emerald-500" style="width: ${percent}%"></div>
                        </div>
                    `;
                    distributionContainer.appendChild(row);
                });

                const channels = data.analytics.donations_by_channel || {};
                const channelContainer = document.getElementById('channel-bars');
                const channelLabels = { web: 'Web', manual: 'Manual' };
                const channelTotal = Object.values(channels).reduce((sum, value) => sum + Number(value), 0) || 1;

                Object.keys(channelLabels).forEach(key => {
                    const value = Number(channels[key] || 0);
                    const percent = Math.round((value / channelTotal) * 100);
                    const row = document.createElement('div');
                    row.innerHTML = `
                        <div class="mb-1 flex items-center justify-between text-xs text-neutral-500">
                            <span>${channelLabels[key]}</span>
                            <span>${value} (${percent}%)</span>
                        </div>
                        <div class="h-2 w-full rounded bg-neutral-200 dark:bg-neutral-700">
                            <div class="h-2 rounded bg-sky-500" style="width: ${percent}%"></div>
                        </div>
                    `;
                    channelContainer.appendChild(row);
                });

                const recentDonations = data.analytics.recent_donations || [];
                const donationRows = document.getElementById('recent-donations-table');
                recentDonations.forEach(item => {
                    const amount = item.cash_amount ?? '-';
                    const row = document.createElement('tr');
                    row.className = 'border-t border-neutral-100 dark:border-neutral-800';
                    row.innerHTML = `
                        <td class="py-2">${item.receipt_code}</td>
                        <td class="py-2">${item.type}</td>
                        <td class="py-2">${item.channel ?? '-'}</td>
                        <td class="py-2">${amount}</td>
                    `;
                    donationRows.appendChild(row);
                });

                const recentAidRequests = data.analytics.recent_aid_requests || [];
                const aidRows = document.getElementById('recent-aid-requests-table');
                recentAidRequests.forEach(item => {
                    const row = document.createElement('tr');
                    row.className = 'border-t border-neutral-100 dark:border-neutral-800';
                    row.innerHTML = `
                        <td class="py-2">${item.beneficiary?.name ?? '-'}</td>
                        <td class="py-2">${item.type}</td>
                        <td class="py-2">${item.status}</td>
                        <td class="py-2">${new Date(item.created_at).toLocaleDateString()}</td>
                    `;
                    aidRows.appendChild(row);
                });

                document.getElementById('print-dashboard-report').addEventListener('click', () => {
                    window.print();
                });

                const rolesResponse = await fetch('{{ route('dashboard.roles') }}', {
                    headers: { 'Accept': 'application/json' },
                    credentials: 'same-origin'
                });
                const rolesPayload = await rolesResponse.json();

                const rolesList = document.getElementById('roles-list');
                const roleSelect = document.getElementById('create-user-role');
                (rolesPayload.roles || []).forEach(role => {
                    const roleCard = document.createElement('div');
                    roleCard.className = 'rounded-md border border-neutral-200 p-2 dark:border-neutral-700';
                    roleCard.innerHTML = `
                        <div class="text-sm font-medium">${role.name}</div>
                        <div class="mt-1 text-xs text-neutral-500">${(role.permissions || []).join(', ')}</div>
                    `;
                    rolesList.appendChild(roleCard);
                });

                (rolesPayload.assignable_roles || []).forEach(role => {
                    const option = document.createElement('option');
                    option.value = role.value;
                    option.textContent = role.value;
                    roleSelect.appendChild(option);
                });

                async function loadUsers() {
                    const usersResponse = await fetch('{{ route('dashboard.users.index') }}?per_page=100', {
                        headers: { 'Accept': 'application/json' },
                        credentials: 'same-origin'
                    });
                    const usersPayload = await usersResponse.json();
                    const users = usersPayload.data || [];
                    const usersTable = document.getElementById('users-table');
                    usersTable.innerHTML = '';

                    users.forEach(user => {
                        const row = document.createElement('tr');
                        row.className = 'border-t border-neutral-100 dark:border-neutral-800';
                        const roleOptions = (rolesPayload.assignable_roles || []).map(role => `
                            <option value="${role.value}" ${role.value === user.role ? 'selected' : ''}>${role.value}</option>
                        `).join('');

                        row.innerHTML = `
                            <td class="py-2">${user.name}</td>
                            <td class="py-2">${user.email}</td>
                            <td class="py-2">
                                <select class="user-role-select dashboard-form-control rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100" data-user-id="${user.id}">
                                    ${roleOptions}
                                </select>
                            </td>
                            <td class="py-2">
                                <button class="save-user-role rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700" data-user-id="${user.id}">
                                    Save
                                </button>
                            </td>
                        `;

                        usersTable.appendChild(row);
                    });

                    document.querySelectorAll('.save-user-role').forEach(button => {
                        button.addEventListener('click', async event => {
                            const userId = event.currentTarget.getAttribute('data-user-id');
                            const select = document.querySelector(`.user-role-select[data-user-id="${userId}"]`);
                            const role = select.value;

                            await fetch(`{{ url('/dashboard/users') }}/${userId}`, {
                                method: 'PATCH',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': csrfToken
                                },
                                credentials: 'same-origin',
                                body: JSON.stringify({ role })
                            });
                        });
                    });
                }

                await loadUsers();

                document.getElementById('create-user-form').addEventListener('submit', async event => {
                    event.preventDefault();
                    const form = event.target;
                    const payload = Object.fromEntries(new FormData(form).entries());

                    const createResponse = await fetch('{{ route('dashboard.users.store') }}', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify(payload)
                    });

                    const feedback = document.getElementById('create-user-feedback');

                    if (!createResponse.ok) {
                        const errorPayload = await createResponse.json();
                        feedback.textContent = errorPayload.message || 'Unable to create user.';
                        feedback.className = 'mt-3 text-xs text-red-500';
                        return;
                    }

                    feedback.textContent = 'User created successfully.';
                    feedback.className = 'mt-3 text-xs text-emerald-500';
                    form.reset();
                    await loadUsers();
                });
            } catch (error) {
                const dashboard = document.getElementById('admin-dashboard');
                const notice = document.createElement('div');
                notice.className = 'rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700';
                notice.textContent = 'Unable to load analytics data. Ensure you are logged in as admin.';
                dashboard.prepend(notice);
            }
        })();
    </script>

    <style>
        /**
         * Admin layout uses html.dark; some browsers still paint form controls with
         * dark text on dark backgrounds. Force light text and autofill styling.
         */
        html.dark #admin-dashboard input.dashboard-form-control,
        html.dark #admin-dashboard select.dashboard-form-control {
            color: #fafafa !important;
            -webkit-text-fill-color: #fafafa;
            caret-color: #fafafa;
        }

        html.dark #admin-dashboard input.dashboard-form-control::placeholder {
            color: #a1a1aa !important;
            opacity: 1;
            -webkit-text-fill-color: #a1a1aa;
        }

        html.dark #admin-dashboard input.dashboard-form-control:-webkit-autofill,
        html.dark #admin-dashboard input.dashboard-form-control:-webkit-autofill:hover,
        html.dark #admin-dashboard input.dashboard-form-control:-webkit-autofill:focus {
            -webkit-text-fill-color: #fafafa !important;
            caret-color: #fafafa;
            transition: background-color 9999s ease-out 0s;
            box-shadow: 0 0 0 1000px #18181b inset !important;
        }

        html.dark #admin-dashboard select.dashboard-form-control option {
            background-color: #18181b;
            color: #fafafa;
        }

        @media print {
            header, aside, .save-user-role, #create-user-form, #dashboard-tabs {
                display: none !important;
            }
            #admin-dashboard {
                gap: 12px !important;
            }
            .dashboard-tab-section {
                display: block !important;
            }
        }
    </style>
</x-layouts.app>
