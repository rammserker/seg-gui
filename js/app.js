const path = require('path'),
    startpath = nw.App.startPath,
    utils = require(path.join(startpath, 'js/file-utils.js')),
    { cleanTemplate } = require(path.join(startpath, 'js/cleanTemplate.js')),
    { processProject } = require(path.join(startpath, 'js/process-seg.js')),
    { parseData } = require(path.join(startpath, 'js/data-parser-etapa2.js')),
    appVersion = 'v0.6';

// Paths comunes
const 
    buildpath   = path.join(startpath, 'build'),
    tplspath    = path.join(startpath, 'project'),
    tmppath     = path.join(startpath, 'tmp');

// Acciones del manager
async function nuevo_proyecto (nombre)
{
    // Pasos:
    // 1) Obtener proypath = buildpath + path
    //      1.1) Si el proyecto ya existe, verificar si realmente se quiere
    //      reiniciar el proyecto.
    // 2) Borrar la carpeta de proyecto
    // 3) Copiar template base de proyecto en proypath
    const proypath = path.join(buildpath, nombre);

    if (utils.existsFile(proypath) && !confirm(`Un proyecto con el nombre ${ nombre } ya existe. Al crear un proyecto con el mismo nombre borrará el anterior. ¿Continuar?`))
    {
        return {
            ok: false,
            msg: `Se canceló la acción ("${ nombre }" ya existe)`
        };
    }

    if (!(await utils.rmFile(proypath, true, true)))
    {
        return {
            ok: false,
            msg: `Hubo un problema al intentar borrar "${ proypath }"`
        };
    }

    if (!(await utils.cpFile(tplspath, proypath, true)))
    {
        return {
            ok: false,
            msg: `Hubo un problema al intentar crear nuevo proyecto en "${ proypath }"`
        };
    }

    return {
        ok: true,
        msg: `Se creó el proyecto "${ nombre }" con éxito`
    };
}

async function abrir_proyecto_dir (name)
{
    await utils.openFile(path.join(buildpath, name));
}

async function generar_datos (proyecto)
{
    // Pasos:
    // 1) verificar que el proyecto existe
    // 2) relevpath = ppath + /relevamiento/relevamiento.xlsx
    const ppath = path.join(buildpath, proyecto),
        rpath = path.join(ppath, 'relevamiento/relevamiento.xlsx'),
        dpath = path.join(ppath, 'data/data.json');

    // 3) node data-parser-etapa2.js relevpath
    const json = await parseData(rpath);
    
    // 4) cp relevpath.json ppat/data/data.json
    await utils.cpFile(json, dpath);
}

async function compilar_informe (proyecto)
{
    console.log('Compilar', proyecto);
    // Pasos:
    // 1) ppath = buildpath + proyecto
    // 2) Limpiar ppath/docx_tmp
    // 3) cp project/docx_tmp a ppath/docx_tmp
    // 4) node process-seg.js ppath
    // 5) mv ppath/document.cml ppath/docx_tmp/word/document.xml
    // 6) comprimir ppath/docx_tmp a ./transicional.zip
    // 7) mv ./transicional.zip a ppath.docx

    // 1) ppath = buildpath + proyecto
    const ppath = path.join(buildpath, proyecto);

    // 2) Limpiar ppath/docx_tmp
    const docx_tmp = path.join(ppath, 'docx_tmp');
    await utils.rmFile(docx_tmp, true, true);

    // 3) cp project/docx_tmp a ppath/docx_tmp
    const ptpl = path.join(tplspath, 'docx_tmp');
    await utils.cpFile(ptpl, docx_tmp, true);

    // 4) node process-seg.js ppath
    const dpath = path.join(ppath, 'data/data.json'),
        opath = path.join(ppath, 'document');

    await processProject(ppath, dpath, opath);

    // 5) mv ppath/document.xml ppath/docx_tmp/word/document.xml
    await utils.mvFile(
        path.join(ppath, 'document.xml'),
        path.join(docx_tmp, 'word/document.xml')
    );

    // 6) comprimir ppath/docx_tmp a ./transicional.zip
    const tzip =path.join(ppath, 'transicional.zip');
    await utils.compress(docx_tmp, tzip);

    // 7) mv ./transicional.zip a ppath.docx
    await utils.mvFile(tzip, path.join(buildpath, `${ proyecto }.docx`));
    console.log('FIN');
}

async function crear_template (nombre)
{
    const tmpl_docx = path.join(tmppath, `${ nombre }.docx`);

    if (!utils.existsFile(tmpl_docx))
    {
        alert(`El template "${ nombre }" no existe. Por favor, colocar el archivo "${ nombre }.docx" en la carpeta de templates para utilizarlo de modelo.`);
        return false;
    }
    
    // Pasos:
    // 1) Limpiar directorios temporales:
    //      - tmp/docx
    //      - tmp/tables
    // 2) Limpiar directorio de template:
    //      - project/docx_tmp
    //      - project/template/tables
    // 3) Copiar archivo docx de template en tmp/docx
    // 4) Exraer tmp/docx/{template}.docx en el lugar
    // 5) Borrar tmp/docx/{template}.docx
    // 6) En la raíz, ejecutar `node cleanTemplate.js`
    // 7) Renombrar tmp/docx/word/document_clean.xml a document.xml
    // 8) Copiar el contenido de tmp/docx/ a project/docx_tmp
    // 9) Copiar tmp/docx/word/document.xml a project/template/index.tpl
    // 10) Copiar el contenido de tmp/tables a project/template/tables

    // Paso 1
    console.log('Paso 1 =====>');
    await utils.rmFile(path.join(tmppath, 'docx'), true, true);
    await utils.mkdir(path.join(tmppath, 'docx'));

    await utils.rmFile(path.join(tmppath, 'tables'), true, true);
    await utils.mkdir(path.join(tmppath, 'tables'));
    console.log('<===== Paso 1');

    // Paso 2
    console.log('Paso 2 =====>');
    await utils.rmFile(path.join(tplspath, 'docx_tmp'), true, true);
    await utils.mkdir(path.join(tplspath, 'docx_tmp'));

    await utils.rmFile(path.join(tplspath, 'template/tables'), true, true);
    await utils.mkdir(path.join(tplspath, 'template/tables'));
    console.log('<===== Paso 2');

    // Paso 3, 4 y 5
    console.log('Paso 3 =====>');
    await utils.decompress(tmpl_docx, path.join(tmppath, 'docx'));
    console.log('<===== Paso 5');

    // Paso 6
    console.log('Paso 6 =====>');
    await cleanTemplate();
    console.log('<===== Paso 6');

    // Paso 7
    console.log('Paso 7 =====>');
    await utils.mvFile(
        path.join(tmppath, 'docx/word/document_clean.xml'),
        path.join(tmppath, 'docx/word/document.xml')
    );
    console.log('<===== Paso 7');
    
    // Paso 8
    // 8) Copiar el contenido de tmp/docx/ a project/docx_tmp
    console.log('Paso 8 =====>');
    await utils.cpFile(
        path.join(tmppath,  'docx'),
        path.join(tplspath, 'docx_tmp'),
        true
    );
    console.log('<===== Paso 8');

    // Paso 9
    // 9) Copiar tmp/docx/word/document.xml a project/template/index.tpl
    console.log('Paso 9 =====>');
    await utils.cpFile(
        path.join(tmppath,  'docx/word/document.xml'),
        path.join(tplspath, 'template/index.tpl')
    );
    console.log('<===== Paso 9');

    // Paso 10
    // 10) Copiar el contenido de tmp/tables a project/template/tables
    console.log('Paso 10 =====>');
    await utils.cpFile(
        path.join(tmppath,  'tables'),
        path.join(tplspath, 'template/tables'),
        true
    );
    console.log('<===== Paso 10');
}

async function refresh_proyectos ()
{
    // Limpiar la vista
    const main = document.querySelector('main');

    main.innerHTML = '';

    const proyectos = (
            await utils.getFilesFromDir(buildpath)
        ).filter(d => d.isdir),
        tpl = document.querySelector('template.tplproject');

    for (const pry of proyectos)
    {
        const elem = tpl.content.cloneNode(true),
            nombre = pry.name;

        elem.querySelector('h2').textContent = pry.name;
        
        // Tiempo creación
        const ctimeel = elem.querySelector('.ctime time');

        ctimeel.setAttribute('datetime', pry.ctime.toISOString());
        ctimeel.textContent = pry.ctime.toLocaleDateString('es-UY', {
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'America/Montevideo'
        });

        // Datos agregados
        const dfpath = path.join(pry.path, 'relevamiento/relevamiento.xlsx');

        if (utils.existsFile(dfpath))
        {
            const dffile = await utils.stat(dfpath),
                dtimeel = elem.querySelector('.dtime time');

            dtimeel.setAttribute('datetime', dffile.ctime.toISOString());
            dtimeel.textContent = dffile.ctime.toLocaleDateString('es-UY', {
                hour: 'numeric',
                minute: 'numeric',
                timeZone: 'America/Montevideo'
            });
        }

        // Compilación
        const xfpath = path.join(buildpath, `${ nombre }.docx`);

        console.log('XFPATH', xfpath);

        if (utils.existsFile(xfpath))
        {
            const xffile = await utils.stat(xfpath),
                xtimeel = elem.querySelector('.xtime time');

            xtimeel.setAttribute('datetime', xffile.ctime.toISOString());
            xtimeel.textContent = xffile.ctime.toLocaleDateString('es-UY', {
                hour: 'numeric',
                minute: 'numeric',
                timeZone: 'America/Montevideo'
            });
        }

        for (const action of elem.querySelectorAll('[data-action]'))
        {
            action.dataset.args = JSON.stringify([ pry.name ]);
        }

        main.append(elem);
    }
}

const acciones = {
    crearTemplate: async function ()
    {
        const tplfile = await utils.openFileExplorer(window, {
            accept: '.docx',
            workingdir: tplspath
        });

        if (path.join(tmppath, tplfile.name) != tplfile.path)
        {
            console.log('Incongruencia', path.join(tmppath, tplfile.name), tplfile.path);
            await utils.cpFile(
                tplfile.path,
                path.join(tmppath, tplfile.name)
            );
        }

        const tplname = path.basename(tplfile.name, '.docx');

        await crear_template(tplname);
    },

    nuevoProyecto: async function ()
    {
        const prynombre = prompt('Introducir el nombre del proyecto');

        if (!prynombre)
        {
            alert('Creación de nuevo proyecto cancelada');
            return;
        }

        return nuevo_proyecto(prynombre);
    },
    dataProyecto: async function (nombre) {
        // Hay que cargar y generar los datos
        // console.log(`Método dataProyecto`, nombre);

        const archivo = await utils.openFileExplorer(window, {
            accept: '.xlsx'
        });

        const ppath = path.join(buildpath, nombre),
            rpath = path.join(ppath, 'relevamiento/relevamiento.xlsx');

        await utils.cpFile(archivo.path, rpath);

        const retorno = {
            ok: true,
            msg: `Se generaron los datos para el proyecto "${ nombre }"`
        };

        try
        {
            await generar_datos(nombre);
        }
        catch (e)
        {
            retorno.ok = false;
            retorno.msg = `Hubo un error al procesar el relevamiento de "${ nombre }".\n`;
            retorno.error = e;

            if (e.name = 'TypeError')
            {
                if (e.message.indexOf('filterButton') > -1)
                {
                    retorno.msg += "\nSeguramente hay filtros presentes en la planilla. Quitarlos y volver a procesar.";
                }

                if (e.message.indexOf('La hoja') > -1)
                {
                    retorno.msg += "\nEl formato del relevamiento es incorrecto para el modelo de datos configurado.";
                }

                retorno.msg += `\n${ e.message }`;
            }
        }

        return retorno;
    },
    abrirDirPry: async function (nombre)
    {
        const ppath = path.join(buildpath, nombre);

        await utils.openFile(ppath);
    },
    compilarProyecto: async function (nombre) {
        // console.log(`Método compilarProyecto`, nombre);
        const retorno = {
            ok: true,
            msg: `Se compiló el proyecto "${ nombre }" con éxito.`
        };

        try
        {
            await compilar_informe(nombre);
        }
        catch (e)
        {
            retorno.ok = false;
            retorno.msg = `Ocurrió un error compilando "${ nombre }". Verifique los datos e imágenes.`;
        }

        return retorno;
    },
    borrarProyecto: async function (nombre)
    {
        // console.log(`Método borrarProyecto`, nombre);
        if (confirm(`¿Está seguro que quiere borrar el proyecto "${ nombre }"?`))
        {
            await utils.rmFile(path.join(buildpath, nombre), true, true);
        }
    },
};

function assignActions ()
{
    const botones = document.querySelectorAll('.action');

    for (const boton of botones)
    {
        boton.addEventListener('click', acciones[boton.dataset.action]);
    }

    console.log(`Se inicializaron ${ botones.length } acciones`);
}

async function manageActions (evt)
{
    const target = evt.target;

    if (target.dataset.action)
    {
        const accion = target.dataset.action,
            args = JSON.parse(target.dataset?.args ?? '[]'),
            mods = target.dataset.mods?.split(' ') ?? [];

        // console.log(accion, args, mods);

        if (mods.find(m => m == 'noawait'))
        {
            acciones[ accion ](...args);
            return;
        }

        window.document.body.classList.add('working');

        const result = await acciones[ accion ](...args);

        refresh_proyectos();
        window.document.body.classList.remove('working');

        if (result?.msg)
        {
            const msg = (!result.ok ? 'Error: ' : '') + result.msg;
            alert(msg);
        }

        if (result?.error)
        {
            console.error(result.error);
        }
    }
}

async function main (dev = false)
{
    console.log(`Iniciando Generador de informes GUI ${ appVersion }`);

    for (const verel of document.querySelectorAll('.appversion'))
    {
        verel.textContent = appVersion;
    }

    if (dev)
    {
        nw.Window.get().showDevTools();
    }

    document.body.addEventListener('contextmenu', evt => {
        evt.preventDefault();
        return false;
    });

    // Setup
    /*
    const buildpath = path.join(startpath, 'build');
    if (utils.existsFile(buildpath))
    {
        console.log('Todo legal', buildpath);
    }
    else
    {
        console.error('Todo mal', buildpath);
    }
    */

    document.body.addEventListener('click', manageActions);

    refresh_proyectos();
}

main(true);
