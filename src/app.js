
        const API_URL = 'https://script.google.com/macros/s/AKfycbzv3uWtmpz3Fg5lo4w4sUOHg4pSmQT6q5T9PJvComTmFB2Vp24BkkIQkW7i6kSxMLVt/exec';
        const MAX_DAYS = 20;
        let chart;

        document.addEventListener('DOMContentLoaded', () => {
            createWaterDroplets();

            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const empty = document.getElementById('empty');
            const grid = document.getElementById('participant-grid');
            const analytics = document.getElementById('analytics');
            const refreshBtn = document.getElementById('refresh-btn');
            const retryBtn = document.getElementById('retry-btn');
            const metricSelect = document.getElementById('metric-select');

            const modal = document.getElementById('modal');
            const closeModal = document.getElementById('close-modal');
            let currentLink = '';

            closeModal.addEventListener('click', () => modal.classList.add('hidden'));
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) modal.classList.add('hidden'); });

            refreshBtn.addEventListener('click', () => {
                sessionStorage.removeItem('challengeData');
                loadData();
            });
            retryBtn.addEventListener('click', loadData);

            metricSelect.addEventListener('change', (e) => updateChart(e.target.value));

            loadData();

            async function loadData() {
                loading.classList.remove('hidden');
                error.classList.add('hidden');
                empty.classList.add('hidden');
                grid.classList.add('hidden');
                analytics.classList.add('hidden');

                try {
                    let data = JSON.parse(sessionStorage.getItem('challengeData'));
                    if (!data) {
                        const res = await fetch(API_URL);
                        if (!res.ok) throw new Error('Fetch failed');
                        data = await res.json();
                        sessionStorage.setItem('challengeData', JSON.stringify(data));
                    }
                    const participants = processData(data);
                    if (participants.length === 0) {
                        empty.classList.remove('hidden');
                    } else {
                        renderSummary(data.length, participants);
                        renderParticipants(participants);
                        initChart(participants);
                        grid.classList.remove('hidden');
                        analytics.classList.remove('hidden');
                    }
                } catch (err) {
                    console.error(err);
                    error.classList.remove('hidden');
                } finally {
                    loading.classList.add('hidden');
                }
            }

            function processData(data) {
                const participantsMap = new Map();
                data.forEach(entry => {
                    if (!entry.name) return;
                    const nameKey = entry.name.trim().toLowerCase();
                    if (!participantsMap.has(nameKey)) {
                        participantsMap.set(nameKey, {
                            name: entry.name.trim(),
                            submissions: [],
                            completion: 0,
                            percent: 0
                        });
                    }
                    const dayStr = entry.day || '';
                    const dayNum = parseInt(dayStr.replace(/\D/g, '')) || 0;
                    const link = entry.link || '';
                    if (dayNum >= 1 && dayNum <= MAX_DAYS && link) {
                        participantsMap.get(nameKey).submissions.push({ day: dayNum, link, dayLabel: dayStr });
                    }
                });

                const participants = Array.from(participantsMap.values());
                participants.forEach(p => {
                    p.submissions.sort((a, b) => a.day - b.day);
                    const uniqueDays = new Set(p.submissions.map(s => s.day));
                    p.completion = uniqueDays.size;
                    p.percent = (p.completion / MAX_DAYS * 100).toFixed(0);
                });
                return participants.sort((a, b) => b.completion - a.completion);
            }

            function renderSummary(totalPosts, participants) {
                const totalParticipants = participants.length;
                const avgCompletion = participants.reduce((sum, p) => sum + parseInt(p.percent), 0) / totalParticipants || 0;
                document.getElementById('total-participants').textContent = totalParticipants;
                document.getElementById('total-posts').textContent = totalPosts;
                document.getElementById('avg-completion').textContent = `${avgCompletion.toFixed(0)}%`;
            }

            function renderParticipants(participants) {
                const grid = document.getElementById('participant-grid');
                grid.innerHTML = '';
                participants.forEach((p, index) => {
                    const card = document.createElement('div');
                    card.className = 'participant-card relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl p-6 border border-cyan-500/30 shadow-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300';
                    card.innerHTML = `
                        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
                        
                        <div class="relative">
                            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h3 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                    ${p.name}
                                </h3>
                                <div class="flex items-center gap-2 bg-cyan-500/20 rounded-full px-3 py-1">
                                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                                    </svg>
                                    <span class="text-cyan-300 font-semibold">${p.percent}%</span>
                                </div>
                            </div>

                            <div class="mb-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="text-cyan-300 text-sm">Challenge Progress</span>
                                    <span class="text-cyan-500 text-xs">(${p.completion}/${MAX_DAYS})</span>
                                </div>
                                <div class="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div class="progress-bar h-full bg-gradient-to-r from-cyan-500 to-blue-500" style="width: ${p.percent}%"></div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                ${p.submissions.map(s => `
                                    <div class="submission-card relative bg-gradient-to-br from-cyan-500/10 to-blue-600/10 backdrop-blur-md rounded-2xl p-4 cursor-pointer border border-cyan-400/30 hover:border-cyan-400/60 group overflow-hidden transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                                         onclick="openModal('${p.name}', '${s.dayLabel}', '${s.link}')">
                                        <div class="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 group-hover:animate-pulse"></div>
                                        <div class="relative flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                                <span class="text-cyan-100 font-semibold">Day ${s.day}</span>
                                            </div>
                                            <svg class="w-4 h-4 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                            </svg>
                                        </div>
                                        <div class="mt-2">
                                            <span class="text-xs text-cyan-300/70 truncate block">Click to view post</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(50px)';
                    grid.appendChild(card);
                    
                    // Animate in
                    setTimeout(() => {
                        card.style.transition = 'all 0.5s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }

            window.openModal = async function(name, dayLabel, link) {
                currentLink = link;
                const content = document.getElementById('modal-content');
                content.innerHTML = `
                    <h3 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
                        ${name}
                    </h3>
                    <p class="text-cyan-300 mb-6">Day ${dayLabel} Submission</p>

                    <div class="bg-slate-800/50 rounded-2xl p-6 border border-cyan-500/30">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-white font-semibold">Twitter/X Post</p>
                                <p class="text-cyan-400 text-sm">View original submission</p>
                            </div>
                        </div>

                        <div id="embed-container" class="mb-4"></div>

                        <a href="${link}" target="_blank" rel="noopener noreferrer"
                           class="block w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all text-center">
                            Open Post on X/Twitter
                        </a>

                        <button id="copy-link" class="mt-2 block w-full bg-gradient-to-r from-ghana-gold to-ghana-gold text-ghana-black font-semibold py-3 px-6 rounded-xl transition-all text-center">
                            Copy Link
                        </button>
                    </div>
                `;

                document.getElementById('copy-link').addEventListener('click', () => {
                    navigator.clipboard.writeText(link);
                    alert('Link copied!');
                });

                modal.classList.remove('hidden');
                modal.classList.add('flex');

                const embedContainer = document.getElementById('embed-container');
                if (link.includes('x.com') || link.includes('twitter.com')) {
                    try {
                        const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(link)}&omit_script=true`;
                        const res = await fetch(oEmbedUrl);
                        if (res.ok) {
                            const { html } = await res.json();
                            embedContainer.innerHTML = html;
                        } else {
                            throw new Error();
                        }
                    } catch {
                        embedContainer.innerHTML = '<p class="text-cyan-300/70 text-sm text-center">Embedded preview unavailable. Use the link above.</p>';
                    }
                } else {
                    embedContainer.innerHTML = '<p class="text-cyan-300/70 text-sm text-center">Embedded preview coming soon for other platforms.</p>';
                }
            };

            function initChart(participants) {
                const ctx = document.getElementById('analytics-chart').getContext('2d');
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: { labels: [], datasets: [{ label: 'Completion %', data: [], backgroundColor: 'rgba(6, 182, 212, 0.6)', borderColor: 'rgba(6, 182, 212, 1)', borderWidth: 1 }] },
                    options: {
                        indexAxis: 'y',
                        scales: { x: { beginAtZero: true } },
                        responsive: true,
                        plugins: { legend: { display: false } }
                    }
                });
                updateChart('completion', participants);
            }

            function updateChart(metric, participants) {
                const topParticipants = participants.slice(0, 10);
                const labels = topParticipants.map(p => p.name);
                let data, label, max;
                if (metric === 'completion') {
                    data = topParticipants.map(p => p.percent);
                    label = 'Completion %';
                    max = 100;
                } else {
                    data = topParticipants.map(p => p.submissions.length);
                    label = 'Total Posts';
                    max = null;
                }
                chart.data.labels = labels;
                chart.data.datasets[0].data = data;
                chart.data.datasets[0].label = label;
                if (max) chart.options.scales.x.max = max;
                chart.update();
            }

            function createWaterDroplets() {
                const container = document.getElementById('waterDroplets');
                for (let i = 0; i < 15; i++) {
                    const droplet = document.createElement('div');
                    droplet.className = 'water-droplet';
                    const size = Math.random() * 20 + 10;
                    const left = Math.random() * 100;
                    const duration = Math.random() * 10 + 15;
                    const delay = Math.random() * 5;
                    droplet.style.width = size + 'px';
                    droplet.style.height = size + 'px';
                    droplet.style.left = left + '%';
                    droplet.style.animationDuration = duration + 's';
                    droplet.style.animationDelay = delay + 's';
                    container.appendChild(droplet);
                }
            }
        });
