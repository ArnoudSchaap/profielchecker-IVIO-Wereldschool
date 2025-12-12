let appData = {};
let currentLevel = null;
let currentProfile = null;

// Keuzes van de gebruiker bijhouden
let userChoices = {
    profileChoice: [],
    examChoice: []
};

// Start de app: Data inladen
document.addEventListener("DOMContentLoaded", () => {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            appData = data;
            initLevelSelect();
        })
        .catch(error => {
            console.error('Fout bij laden JSON:', error);
            alert('Kan de data niet laden. Als je dit lokaal opent, gebruik dan een local server of Firefox.');
        });
});

function initLevelSelect() {
    const select = document.getElementById('level-select');
    appData.levels.forEach(level => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        const levelId = e.target.value;
        currentLevel = appData.levels.find(l => l.id === levelId);
        document.getElementById('profile-section').classList.add('hidden');
        document.getElementById('subjects-section').classList.add('hidden');
        document.getElementById('summary-section').classList.add('hidden');
        
        if (currentLevel) {
            renderProfiles();
        }
    });
}

function renderProfiles() {
    const container = document.getElementById('profile-buttons');
    container.innerHTML = '';
    const section = document.getElementById('profile-section');
    section.classList.remove('hidden');

    currentLevel.profiles.forEach(profile => {
        const btn = document.createElement('button');
        btn.textContent = profile.name;
        btn.className = 'profile-btn';
        btn.onclick = () => selectProfile(profile, btn);
        container.appendChild(btn);
    });
}

function selectProfile(profile, btnElement) {
    currentProfile = profile;
    
    // Visuele update knoppen
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');

    // Reset keuzes
    userChoices.profileChoice = [];
    userChoices.examChoice = [];

    renderSubjects();
}

function renderSubjects() {
    document.getElementById('subjects-section').classList.remove('hidden');
    document.getElementById('summary-section').classList.remove('hidden');

    // 1. Gemeenschappelijk
    renderStaticList('common-list', currentLevel.common_subjects);

    // 2. Profiel Verplicht
    renderStaticList('mandatory-list', currentProfile.mandatory_subjects);

    // 3. Profiel Keuzevak
    renderCheckboxes(
        'profile-choice-list', 
        'profile-choice-instruction',
        currentProfile.profile_choice, 
        'profileChoice'
    );

    // 4. Examenvak
    renderCheckboxes(
        'exam-choice-list', 
        'exam-choice-instruction',
        currentProfile.exam_choice, 
        'examChoice'
    );
    
    updateAvailability(); // Eerste keer checken
    updateSummary();
}

function renderStaticList(elementId, subjects) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    subjects.forEach(subj => {
        const li = document.createElement('li');
        li.textContent = subj;
        list.appendChild(li);
    });
}

function renderCheckboxes(containerId, instructionId, config, choiceType) {
    const container = document.getElementById(containerId);
    const instruction = document.getElementById(instructionId);
    const block = container.parentElement; // Het gehele blok (h4 + p + div)

    container.innerHTML = '';

    // Check of er überhaupt iets te kiezen valt (bij Techniek is amount 0)
    if (config.amount === 0) {
        block.style.display = 'none'; // Verberg het hele blok
        return;
    } else {
        block.style.display = 'block'; // Toon het blok
    }

    instruction.textContent = `Kies ${config.amount} vak(ken):`;

    config.options.forEach(subject => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = subject;
        input.dataset.type = choiceType;
        
        // Event listener
        input.addEventListener('change', () => handleSelection(input, config.amount, choiceType));

        label.appendChild(input);
        label.appendChild(document.createTextNode(subject));
        container.appendChild(label);
    });
}

function handleSelection(input, maxAllowed, type) {
    const val = input.value;

    if (input.checked) {
        // Toevoegen
        if (userChoices[type].length < maxAllowed) {
            userChoices[type].push(val);
        } else {
            input.checked = false; // Mag niet, limiet bereikt
            alert(`Je mag hier maximaal ${maxAllowed} vakken kiezen.`);
        }
    } else {
        // Verwijderen
        userChoices[type] = userChoices[type].filter(item => item !== val);
    }

    updateAvailability();
    updateSummary();
}

function updateAvailability() {
    // Logica: Als je een vak kiest bij Profielkeuze, mag die niet meer bij Examenvak
    // En: als limiet bereikt is, disable de rest.

    const types = ['profileChoice', 'examChoice'];

    types.forEach(type => {
        const config = (type === 'profileChoice') ? currentProfile.profile_choice : currentProfile.exam_choice;
        const currentSelected = userChoices[type];
        const container = document.getElementById(type === 'profileChoice' ? 'profile-choice-list' : 'exam-choice-list');
        const inputs = container.querySelectorAll('input');

        // Verzamel vakken die elders al gekozen zijn (anti-dubbel)
        let forbidden = [];
        if (type === 'examChoice') {
            forbidden = userChoices.profileChoice; // Wat je bij 3 kiest, mag niet bij 4
        }
        
        // Check limiet
        const limitReached = currentSelected.length >= config.amount;

        inputs.forEach(input => {
            const subject = input.value;
            const isSelected = input.checked;

            // Is dit vak al gekozen in de andere lijst?
            if (forbidden.includes(subject)) {
                input.disabled = true;
                input.parentElement.classList.add('disabled');
                input.checked = false; // Veiligheidshalve
            } 
            // Is de limiet bereikt en is dit vak NIET geselecteerd?
            else if (limitReached && !isSelected) {
                input.disabled = true;
                input.parentElement.classList.add('disabled');
            } 
            // Anders gewoon open
            else {
                input.disabled = false;
                input.parentElement.classList.remove('disabled');
            }
        });
    });
}

function updateSummary() {
    const summary = document.getElementById('summary-content');
    // Simpele weergave, kan uitgebreid worden
    let html = `<p><strong>Niveau:</strong> ${currentLevel.name}</p>`;
    html += `<p><strong>Profiel:</strong> ${currentProfile.name}</p>`;
    
    const allSubjects = [
        ...currentLevel.common_subjects,
        ...currentProfile.mandatory_subjects,
        ...userChoices.profileChoice,
        ...userChoices.examChoice
    ];

    html += `<p><strong>Jouw vakkenpakket (${allSubjects.length} vakken):</strong><br>`;
    html += allSubjects.join(', ') + `</p>`;
    
    summary.innerHTML = html;
}