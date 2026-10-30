export default {
    render: () => {
        return `
            <div class="page-enter max-w-md mx-auto">
                <!-- Profile Header -->
                <div class="bg-white p-6 flex items-center gap-4 border-b border-gray-100">
                    <div class="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 text-2xl overflow-hidden border-2 border-white shadow-sm">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <h2 class="font-bold text-lg">0964912007</h2>
                        <span class="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full mt-1 inline-block">Intern</span>
                    </div>
                </div>

                <!-- Settings List -->
                <div class="mt-4 bg-white rounded-xl shadow-sm mx-4 overflow-hidden border border-gray-100">
                    <a href="#/profile/edit" class="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3 text-gray-700">
                            <i class="fas fa-user-edit text-gray-400 w-5"></i>
                            <span class="text-sm font-medium">መገለጫ አርትዕ</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                    </a>
                    <a href="#/profile/password" class="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3 text-gray-700">
                            <i class="fas fa-lock text-gray-400 w-5"></i>
                            <span class="text-sm font-medium">የይለፍ ቃል ቀይር</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                    </a>
                    <a href="#/profile/notifications" class="flex items-center justify-between p-4 border-b border-gray-50 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3 text-gray-700">
                            <i class="fas fa-bell text-gray-400 w-5"></i>
                            <span class="text-sm font-medium">ማሳወቂያዎች</span>
                        </div>
                        <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
                    </a>
                </div>

                <!-- Logout Button -->
                <div class="p-4 mt-2">
                    <button class="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-orange-600 transition flex items-center justify-center gap-2">
                        <i class="fas fa-sign-out-alt"></i> ውጣ
                    </button>
                </div>
            </div>
        `;
    },
    init: () => {}
};