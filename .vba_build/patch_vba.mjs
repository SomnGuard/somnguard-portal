import fs from "node:fs";
import CFB from "cfb";

const input = ".vba_build/vbaProject.bin";
const output = ".vba_build/vbaProject_patched.bin";

function compressUncompressed(source) {
  const bytes = Buffer.from(source, "latin1");
  const parts = [Buffer.from([0x01])];

  for (let start = 0; start < bytes.length; start += 4096) {
    const chunk = bytes.subarray(start, Math.min(start + 4096, bytes.length));
    const header = 0x3000 | (chunk.length - 1);
    const headerBytes = Buffer.alloc(2);
    headerBytes.writeUInt16LE(header, 0);
    parts.push(headerBytes, chunk);
  }

  return Buffer.concat(parts);
}

function replaceModuleSource(cfb, path, offset, source) {
  const index = cfb.FullPaths.indexOf(path);
  if (index < 0) throw new Error(`No se encontró el módulo ${path}.`);

  const original = Buffer.from(cfb.FileIndex[index].content);
  cfb.FileIndex[index].content = Buffer.concat([
    original.subarray(0, offset),
    compressUncompressed(source),
  ]);
  cfb.FileIndex[index].size = cfb.FileIndex[index].content.length;
}

const moduleCode = String.raw`Attribute VB_Name = "Módulo1"
Option Explicit

Public contador As Long

Public Sub prueba()
    UserForm1.Show
End Sub

Public Sub ReiniciarContador()
    contador = 0
End Sub

Public Function ValidarRequerido(ByVal control As Object) As Boolean
    If Trim$(CStr(control.Value)) = vbNullString Then
        contador = contador + 1
        control.BackColor = RGB(255, 235, 156)
        ValidarRequerido = False
    Else
        control.BackColor = VbWhite
        ValidarRequerido = True
    End If
End Function

Public Function ValidarCorreo(ByVal cajaCorreo As Object) As Boolean
    Dim correo As String
    correo = Trim$(CStr(cajaCorreo.Value))

    If correo Like "*@*.*" And InStr(1, correo, " ") = 0 Then
        cajaCorreo.BackColor = VbWhite
        ValidarCorreo = True
    Else
        contador = contador + 1
        cajaCorreo.BackColor = RGB(255, 235, 156)
        ValidarCorreo = False
    End If
End Function

Public Function ValidarNumero(ByVal cajaNumero As Object) As Boolean
    If IsNumeric(Trim$(CStr(cajaNumero.Value))) Then
        cajaNumero.BackColor = VbWhite
        ValidarNumero = True
    Else
        contador = contador + 1
        cajaNumero.BackColor = RGB(255, 235, 156)
        ValidarNumero = False
    End If
End Function

Public Function ValidarFecha(ByVal cajaFecha As Object) As Boolean
    If IsDate(Trim$(CStr(cajaFecha.Value))) Then
        cajaFecha.BackColor = VbWhite
        ValidarFecha = True
    Else
        contador = contador + 1
        cajaFecha.BackColor = RGB(255, 235, 156)
        ValidarFecha = False
    End If
End Function

Public Function ValidarSeleccion(ByVal opcionSeleccionada As Boolean, ByVal controlVisual As Object) As Boolean
    If opcionSeleccionada Then
        controlVisual.BackColor = VbWhite
        ValidarSeleccion = True
    Else
        contador = contador + 1
        controlVisual.BackColor = RGB(255, 235, 156)
        ValidarSeleccion = False
    End If
End Function

Public Function SiguienteItem(ByVal hoja As Worksheet) As Long
    Dim ultimo As Double

    On Error Resume Next
    ultimo = Application.WorksheetFunction.Max(hoja.Range("B:B"))
    On Error GoTo 0

    SiguienteItem = CLng(ultimo) + 1
End Function

Public Function CodigoDesdeItem(ByVal item As Long) As String
    CodigoDesdeItem = "A" & Format$(item, "000")
End Function

Public Function NivelEstudio(ByVal formulario As Object) As String
    If formulario.OptionButton1.Value Then NivelEstudio = "NO ESTUDIO": Exit Function
    If formulario.OptionButton2.Value Then NivelEstudio = "PRIMARIA": Exit Function
    If formulario.OptionButton3.Value Then NivelEstudio = "SECUNDARIA": Exit Function
    If formulario.OptionButton4.Value Then NivelEstudio = "SUPERIOR"
End Function
`;

const formCode = String.raw`Attribute VB_Name = "UserForm1"
Attribute VB_Base = "0{EA69FEF3-11F1-46E0-9360-1C638A234FF7}{B2354B1E-8394-411D-BE12-95BF8A8818A7}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit

Private Sub UserForm_Initialize()
    PrepararNuevoRegistro
End Sub

Private Sub PrepararNuevoRegistro()
    Dim ws As Worksheet
    Dim nuevoItem As Long

    Set ws = ThisWorkbook.Worksheets("BASE DE DATOS ")
    nuevoItem = SiguienteItem(ws)
    Me.TextBox1.Value = CodigoDesdeItem(nuevoItem)
    Me.TextBox1.Locked = True
    Me.TextBox1.BackColor = VbWhite
End Sub

Private Sub CommandButton2_Click()
    Dim ws As Worksheet
    Dim tabla As ListObject
    Dim nuevaFila As ListRow
    Dim nuevoItem As Long

    Set ws = ThisWorkbook.Worksheets("BASE DE DATOS ")
    Set tabla = ws.ListObjects("CLIENTES")
    nuevoItem = SiguienteItem(ws)
    Me.TextBox1.Value = CodigoDesdeItem(nuevoItem)
    Me.TextBox1.Locked = True

    ReiniciarContador

    ValidarRequerido Me.TextBox2
    ValidarRequerido Me.TextBox3
    ValidarRequerido Me.TextBox4
    ValidarRequerido Me.TextBox5
    ValidarRequerido Me.TextBox6
    ValidarRequerido Me.ComboBox1
    ValidarRequerido Me.TextBox7
    ValidarRequerido Me.TextBox8
    ValidarRequerido Me.TextBox10
    ValidarRequerido Me.TextBox11
    ValidarRequerido Me.TextBox12

    If Trim$(Me.TextBox2.Value) <> vbNullString Then ValidarNumero Me.TextBox2
    If Trim$(Me.TextBox8.Value) <> vbNullString Then ValidarNumero Me.TextBox8
    If Trim$(Me.TextBox6.Value) <> vbNullString Then ValidarFecha Me.TextBox6
    If Trim$(Me.TextBox7.Value) <> vbNullString Then ValidarCorreo Me.TextBox7
    ValidarSeleccion (Me.OptionButton1.Value Or Me.OptionButton2.Value Or _
                      Me.OptionButton3.Value Or Me.OptionButton4.Value), Me.Frame2

    If contador <> 0 Then
        MsgBox "Por favor complete los campos vacíos o corrija los resaltados.", _
               vbExclamation, "Datos pendientes"
        Exit Sub
    End If

    Set nuevaFila = tabla.ListRows.Add
    With nuevaFila.Range
        .Cells(1, 1).Value = nuevoItem
        .Cells(1, 2).Value = Me.TextBox1.Value
        .Cells(1, 3).Value = Trim$(Me.TextBox5.Value) & " " & Trim$(Me.TextBox4.Value)
        .Cells(1, 4).Value = Trim$(Me.TextBox3.Value)
        .Cells(1, 7).Value = CDate(Me.TextBox6.Value)
        .Cells(1, 8).Value = CLng(Me.TextBox2.Value)
        .Cells(1, 9).Value = Me.ComboBox1.Value
        .Cells(1, 10).Value = Trim$(Me.TextBox8.Value)
        .Cells(1, 11).Value = Trim$(Me.TextBox7.Value)
        .Cells(1, 12).Value = NivelEstudio(Me)
        .Cells(1, 13).Value = Trim$(Me.TextBox11.Value)
        .Cells(1, 14).Value = Trim$(Me.TextBox12.Value)
        .Cells(1, 15).Value = Trim$(Me.TextBox9.Value)
        .Cells(1, 16).Value = Trim$(Me.TextBox10.Value)
    End With

    MsgBox "Registro guardado con el código " & Me.TextBox1.Value & ".", _
           vbInformation, "Registro correcto"
    LimpiarFormulario
    PrepararNuevoRegistro
End Sub

Private Sub LimpiarFormulario()
    Dim control As Control

    For Each control In Me.Controls
        If TypeName(control) = "TextBox" And control.Name <> "TextBox1" Then
            control.Value = vbNullString
            control.BackColor = VbWhite
        ElseIf TypeName(control) = "ComboBox" Then
            control.Value = vbNullString
            control.BackColor = VbWhite
        ElseIf TypeName(control) = "OptionButton" Then
            control.Value = False
        End If
    Next control
End Sub

Private Sub TextBox2_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarNumero Me.TextBox2: End Sub
Private Sub TextBox3_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox3: End Sub
Private Sub TextBox4_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox4: End Sub
Private Sub TextBox5_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox5: End Sub
Private Sub TextBox6_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarFecha Me.TextBox6: End Sub
Private Sub TextBox7_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarCorreo Me.TextBox7: End Sub
Private Sub TextBox8_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarNumero Me.TextBox8: End Sub
Private Sub TextBox10_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox10: End Sub
Private Sub TextBox11_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox11: End Sub
Private Sub TextBox12_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.TextBox12: End Sub
Private Sub ComboBox1_Exit(ByVal Cancel As MSForms.ReturnBoolean): ReiniciarContador: ValidarRequerido Me.ComboBox1: End Sub
`;

const cfb = CFB.read(fs.readFileSync(input), { type: "buffer" });
replaceModuleSource(cfb, "Root Entry/VBA/Módulo1", 974, moduleCode.replaceAll("\n", "\r\n"));
replaceModuleSource(cfb, "Root Entry/VBA/UserForm1", 1327, formCode.replaceAll("\n", "\r\n"));
fs.writeFileSync(output, CFB.write(cfb, { type: "buffer" }));
