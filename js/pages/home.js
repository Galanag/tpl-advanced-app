export default {
    render: () => {
        return `
            <div class="page-enter max-w-md mx-auto">
                <!-- Announcement Banner -->
                <div class="bg-orange-100 text-orange-800 text-xs p-3 m-4 rounded-lg flex items-start gap-2 shadow-sm">
                    <i class="fas fa-bullhorn mt-0.5"></i>
                    <p><strong>እንኳን ወደ TPL በደህና መጡ!</strong> አሁን ያሉት አማራጮች በቅርቡ ይሻሻላሉ።</p>
                </div>

                <!-- Hero Slider -->
                <div class="px-4 mb-6">
                    <div class="relative w-full h-48 rounded-2xl overflow-hidden shadow-lg group">
                        <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800" alt="Featured" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                            <span class="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded self-start mb-2">VIP አባል</span>
                            <h3 class="text-white font-bold text-lg">Global Film Distribution</h3>
                            <p class="text-gray-300 text-xs mt-1">03:59 • ሙሉ ፊልም</p>
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <button class="w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/50 transition">
                                <i class="fas fa-play text-white ml-1"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions Grid -->
                <div class="grid grid-cols-4 gap-2 px-4 mb-6">
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xl"><i class="fas fa-film"></i></div>
                        <span class="text-[10px] text-gray-600 text-center">ገንዘብ መመለሻ</span>
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xl"><i class="fas fa-list-alt"></i></div>
                        <span class="text-[10px] text-gray-600 text-center">ገንዘብ ማጠራቀሚያ</span>
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-xl"><i class="fas fa-user-plus"></i></div>
                        <span class="text-[10px] text-gray-600 text-center">መጋበዣ</span>
                    </div>
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-12 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center text-xl"><i class="fas fa-chart-bar"></i></div>
                        <span class="text-[10px] text-gray-600 text-center">ፍጥነት</span>
                    </div>
                </div>

                <!-- Movie Section -->
                <div class="px-4 mb-4 flex justify-between items-end">
                    <h2 class="font-bold text-lg">የፊልም ተከታታዮች</h2>
                    <a href="#/tasks" class="text-primary text-xs font-medium">ሁሉንም ይመልከቱ <i class="fas fa-chevron-right text-[10px]"></i></a>
                </div>

                <div class="grid grid-cols-2 gap-3 px-4 pb-6">
                    <!-- Movie Card 1 -->
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <img src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=400" class="w-full h-40 object-cover">
                        <div class="p-3">
                            <h3 class="font-bold text-sm truncate">Harry Potter</h3>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">የተረጋገጠ</span>
                                <span class="text-primary text-xs font-bold">10%</span>
                            </div>
                        </div>
                    </div>
                    <!-- Movie Card 2 -->
                    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <img src="https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&q=80&w=400" class="w-full h-40 object-cover">
                        <div class="p-3">
                            <h3 class="font-bold text-sm truncate">The Batman: Part II</h3>
                            <div class="flex justify-between items-center mt-2">
                                <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded">የተረጋገጠ</span>
                                <span class="text-primary text-xs font-bold">10%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    init: () => {
        console.log("Home Page Initialized");
        // Add slider logic or data fetching here
    }
};