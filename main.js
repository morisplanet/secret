const supabaseClient = supabase.createClient(
  "https://yxvgwmxlznpxqmmiofuy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dmd3bXhsem5weHFtbWlvZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTU5NzYsImV4cCI6MjA2NzI3MTk3Nn0.4XZQOkWmI1CLq-FR3KM5sD7ohn0iHdcRqrf5-KFmkho"
);

const currentYear = 2024;
// const currentYear = new Date().getFullYear();
const yearElements = document.querySelectorAll('.current-year');
yearElements.forEach(element => {
    element.textContent = currentYear;
});

const genderDataDiv = document.getElementById('genderData');
const ageDataDiv = document.getElementById('ageData');

let genderChartInstance = null;
let ageChartInstance = null;
let yearlyChartInstance = null;

async function fetchData() {
    try {
    //For current cases
        const { data: currentData, error: currentError } = await supabaseClient
            .from('record_summary')
            .select('Total')
            .eq('Year', currentYear.toString());

        if (currentError) {
            console.error("Error fetching data:", currentError);
            return;
        }
        const totalCases = currentData.reduce((acc, record) => acc + record.Total, 0);   
    // For monthly dengue incidence
        const chunkSize = 1000;
        let allData = [];
        let from = 0;
        let to = chunkSize - 1;
        let keepFetching = true;

        while (keepFetching) {
            const { data: monthlyData, error: monthlyError } = await supabaseClient
                .from('records')
                .select('Month, Cases')
                .eq('Year', currentYear)
                .range(from, to);

            if (monthlyError) {
                console.error('Error fetching data:', monthlyError);
                break;
            }

            allData = allData.concat(monthlyData);
            
            if (monthlyData.length < chunkSize) {
                keepFetching = false;
            } else {
                from += chunkSize;
                to += chunkSize;
            }
        }
        const monthNames = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
        };

        const monthsWithData = Array(12).fill(0);
        allData.forEach(record => {
            const cases = parseFloat(record.Cases);
            const monthName = record.Month;

            if (monthNames[monthName] !== undefined) {
                const monthIndex = monthNames[monthName];
                monthsWithData[monthIndex] += cases;
            } else {
                console.warn(`Invalid month data: ${record.Month}`);
            }
        });

    //For 5-year incidence
        const { data: yearlyData, error: yearlyError } = await supabaseClient
            .from('record_summary')
            .select('Total, Year')
            .in('Year', [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4]);

        if (yearlyError) {
            console.error("Error fetching data:", yearlyError);
            return;
        }
        
        const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
        const totals = [0, 0, 0, 0, 0];
        
        yearlyData.forEach(record => {
            const recordYear = parseInt(record.Year, 10);
            const yearIndex = years.indexOf(recordYear);

            if (yearIndex !== -1) {
                totals[yearIndex] += record.Total;
            }
        });

    //For pie charts
        const { data: pieData, error: pieError } = await supabaseClient
            .from('record_summary')
            .select('Male, Female, 0_to_10, 11_to_20, 21_to_30, 31_to_40, 41_to_50, 51_to_60, 61_and_above')
            .eq('Year', 2024);

        if (pieError) {
            console.error("Data fetch error:", pieError.message);
            return;
        }
                
        let total_male = 0;
        let total_female = 0;
        let total_0_to_10 = 0;
        let total_11_to_20 = 0;
        let total_21_to_30 = 0;
        let total_31_to_40 = 0;
        let total_41_to_50 = 0;
        let total_51_to_60 = 0;
        let total_61_and_above = 0;

        pieData.forEach(row => {
            total_male += parseInt(row.Male, 10) || 0;
            total_female += parseInt(row.Female, 10) || 0;
            total_0_to_10 += parseInt(row["0_to_10"], 10) || 0;
            total_11_to_20 += parseInt(row["11_to_20"], 10) || 0;
            total_21_to_30 += parseInt(row["21_to_30"], 10) || 0;
            total_31_to_40 += parseInt(row["31_to_40"], 10) || 0;
            total_41_to_50 += parseInt(row["41_to_50"], 10) || 0;
            total_51_to_60 += parseInt(row["51_to_60"], 10) || 0;
            total_61_and_above += parseInt(row["61_and_above"], 10) || 0;
        });

        displayDashboard(totalCases, years, totals, monthsWithData, ['January', 'Febuary', 'March', 'April', 'May',
            'June', 'July', 'August', 'September', 'October', 'November', 'December'], total_male, total_female,
            total_0_to_10, total_11_to_20, total_21_to_30, total_31_to_40, total_41_to_50, total_51_to_60, total_61_and_above);
    } catch (err) {
        console.error("Error:", err);
    }
}

function displayDashboard(totalCases, years, totals, monthsWithData, months, total_male, total_female,
            total_0_to_10, total_11_to_20, total_21_to_30, total_31_to_40, total_41_to_50, total_51_to_60, total_61_and_above) {
    document.getElementById('current-cases').textContent = totalCases;
    
    const monthctx = document.getElementById('month-trend').getContext('2d');
    new Chart(monthctx, {
        type: 'bar',
        data: {
            labels: months, 
            datasets: [{
                label: `Dengue Cases in ${currentYear}`, 
                data: monthsWithData, 
                backgroundColor: 'rgba(75, 192, 192, 0.2)', 
                borderColor: 'rgba(75, 192, 192, 1)', 
                borderWidth: 1}]},
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: false
            }, 
            scales: {
                x: {
                    display: false
                }, 
                y: {
                    display: false
                }
            }
        }
    });

    const yearctx = document.getElementById('year-trend').getContext('2d');
    new Chart(yearctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Total Cases per Year', 
                data: totals, 
                borderColor: '#4BC0C0', 
                fill: false, 
                tension: 0.1}
            ]},
        options: {
            responsiveness: true, 
            plugins: {
                tooltip: {
                    enabled: true
                }, 
                legend: {
                    display: false
                },
                 datalabels: false
            }, 
            scales: {
                x: {
                    display: false
                }, 
                y: {
                    display: false
                }
            }
        }
    });

    const genderctx = document.getElementById('gender-chart').getContext('2d');
    new Chart(genderctx, {
        type: 'pie',
        data: {
        labels: ['Male', 'Female'],
        datasets: [{
            data: [total_male, total_female],
            backgroundColor: ['#36A2EB', '#1e3c72'],
            borderWidth: 0
        }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            },
            tooltip: {
                enabled: true
            }
          }
        }
    });

    const agectx = document.getElementById('age-chart').getContext('2d');
    new Chart(agectx, {
        type: 'pie',
        data: {
        labels: ['10 and below', '11-20', '21-30', '31-40', '41-50', '51-60', '61 and above'],
        datasets: [{
            data: [total_0_to_10, total_11_to_20, total_21_to_30, total_31_to_40, total_41_to_50, total_51_to_60, total_61_and_above],
            backgroundColor: ['#36A2EB', '#1E3C72', '#FF4500', '#2ECC71', '#FF1493', '#FFD700', '#800080'],
            borderWidth: 0
        }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom'
            },
            tooltip: {
                enabled: true
            }
          }
        }
    });
    
    document.getElementById('loading').style.display = 'none';
}

async function loadContent() {
    const { data, error } = await supabaseClient.from('site_content').select('*');
    if (error) {
        console.error('Error loading content:', error);
        return;
    }
    
    const getValue = (key) => data.find(item => item.key === key)?.value || '';
    document.getElementById('prevention_header_title').textContent = getValue('prevention_header_title');
    document.getElementById('prevention_header_text').textContent = getValue('prevention_header_text');
}

async function loadPreventionContent() {
    const preventionContentContainer = document.getElementById('prevention_content_container');
    const { data, error } = await supabaseClient
        .from('prevention_content')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Load error:', error.message);
        return;
    }

    preventionContentContainer.innerHTML = ''; // Clear old content

    data.forEach(row => {
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('prevention-item');

        contentDiv.innerHTML = `
            <h3 id="title-${row.id}" class="prevention-content-title"><strong>${row.title}</strong></h3>
            <div id="content-${row.id}" class="prevention-content-text">${row.content}</div>`;

        preventionContentContainer.appendChild(contentDiv);
    });
}

async function loadPublicReferences() {
    const { data, error } = await supabaseClient
        .from('references')
        .select('*')
        .order('created_at', { ascending: true });

    const list = document.getElementById('reference-list');
    list.innerHTML = '';
    data.forEach(ref => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${ref.href}" target="_blank">${ref.title}</a>`;
        list.appendChild(li);
    });
}

async function loadContactDetails() {
    const container = document.getElementById('contact-details-row');
    if (!container) return;

    const { data, error } = await supabaseClient
        .from('contact_details')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) return console.error(error);

    container.innerHTML = '';

    data.forEach(row => {
        const block = document.createElement('div');
        block.className = 'contact-block';
        block.innerHTML = `
            <h3>${row.office_name}</h3>
            <p>${row.address}<br>Phone: ${row.phone}<br>
            Email: <a href="mailto:${row.email}">${row.email}</a><br>
            ${row.facebook_url ? `Facebook: <a href="${row.facebook_url}" target="_blank">${row.facebook_url}</a>` : ''}
            </p>`;

        container.appendChild(block);
    });
}

let map;

function initMap(lat, lon) {
    map = L.map('hospital_map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'}).addTo(map);

    // User location marker
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    L.marker([lat, lon], { icon: redIcon }).addTo(map)
        .bindPopup("You are here")
        .openPopup();
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

async function getNearbyHospitals(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=10&bounded=1&viewbox=${lon - 0.1},${lat + 0.1},${lon + 0.1},${lat - 0.1}`;
    const res = await fetch(url);
    const data = await res.json();

    const list = document.getElementById('hospital-list');
    list.innerHTML = '';

    // Add distance to each hospital object
    const hospitalsWithDistance = data.map(hospital => {
        const hospitalLat = parseFloat(hospital.lat);
        const hospitalLon = parseFloat(hospital.lon);
        const distance = getDistance(lat, lon, hospitalLat, hospitalLon);
        return { ...hospital, distance };
    });

    // Sort by distance
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    // Add to table and map
    hospitalsWithDistance.forEach(hospital => {
        const name = hospital.display_name.split(',')[0].trim();
        const addressParts = hospital.display_name.split(',').slice(1, -3).map(p => p.trim());
        const cleanAddress = addressParts.join(', ');

        // Table row
        const row = document.createElement('tr');
        row.innerHTML = `<td>${name}</td><td>${cleanAddress}</td><td>${hospital.distance.toFixed(2)} km</td>`;
        list.appendChild(row);

        // Map marker
        L.marker([hospital.lat, hospital.lon])
        .addTo(map)
        .bindPopup(`<strong>${name}</strong><br>${cleanAddress}<br>${hospital.distance.toFixed(2)} km away`);
    });
}

navigator.geolocation.getCurrentPosition(
    pos => {
        const { latitude, longitude } = pos.coords;
        initMap(latitude, longitude);
        getNearbyHospitals(latitude, longitude);
    },
    err => {
        alert("Location access denied or unavailable.");
    }
);

document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    loadContent();
    loadPreventionContent();
    loadPublicReferences();
    loadContactDetails();
    
    const sidebar = document.querySelector('.sidebar');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const mainContent = document.querySelector('.main-content');
    const navLinks = document.querySelectorAll('.sidebar ul li a');
    const contentSections = document.querySelectorAll('.content-section');
    const overlay = document.getElementById('modal-overlay');
    const infoModal = document.getElementById('info-modal');

    // Sidebar Navigation
    if (sidebar && hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    // Highlighting Active Link on Sidebar
    if (mainContent) {
        mainContent.addEventListener('scroll', updateActiveNavLink);
    }
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavLinkClick);
    });
    function handleNavLinkClick(e) {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement && mainContent) {
            mainContent.scrollTo({ top: targetElement.offsetTop, behavior: 'smooth' });
        }
    }
    function updateActiveNavLink() {
        let currentSectionId = '';
        contentSections.forEach(section => {
            if (section.offsetTop <= mainContent.scrollTop + 150) { 
                currentSectionId = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${currentSectionId}`);
        });
    }
    //Modal
    // Shows info modal when the button is clicked
    function initializeModal(triggerId, modalElement) {
        const trigger = document.querySelector(`#${triggerId}, .${triggerId}`);
        if (trigger && modalElement) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                showModal(modalElement);
            });
        }
    }
    // Show modal with overlay
    function showModal(modalElement) {
        if (overlay) overlay.style.display = 'block';
        if (modalElement) modalElement.style.display = 'flex';
    }
    //  Close modal with overlay
    function closeAllModals() {
        if (overlay) overlay.style.display = 'none';
        if (infoModal) infoModal.style.display = 'none';
    }
    // Close modals on overlay click
    if (overlay) {
        overlay.addEventListener('click', closeAllModals);
    }
    initializeModal('info-btn', infoModal); 


}); 

